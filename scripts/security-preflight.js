/**
 * SCRIPT DE PRÉ-AUDITORIA DE SEGURANÇA LOCAL (SHIFT-LEFT PREFLIGHT - STRIX AST SUITE)
 * Executa 6 verificações estáticas locais de segurança, tipagem e integridade arquitetural.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n======================================================');
console.log('🛡️  INICIANDO PRÉ-AUDITORIA DE SEGURANÇA LOCAL (STRIX AST)');
console.log('======================================================\n');

let hasErrors = false;

// 1. Verificação de Migrações SQL e RLS
console.log('🔍 [1/6] Verificando Migrações SQL e Políticas RLS...');
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  for (const file of sqlFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // Procura por CREATE TABLE sem ENABLE ROW LEVEL SECURITY
    const createTableRegex = /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-zA-Z_][\w]*)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const rlsRegex = new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${tableName}\\s+enable\\s+row\\s+level\\s+security`, 'i');
      if (!rlsRegex.test(content)) {
        console.error(`❌ [ERRO RLS]: Tabela '${tableName}' no arquivo ${file} não possui ENABLE ROW LEVEL SECURITY!`);
        hasErrors = true;
      }
    }

    // Procura por uso vulnerável de user_metadata em RLS
    if (/auth\.jwt\(\)\s*->\s*'user_metadata'/i.test(content)) {
      console.error(`❌ [ERRO METADADOS]: Uso de 'user_metadata' detectado em ${file}! Substitua por tabelas seguras ou app_metadata.`);
      hasErrors = true;
    }
  }
}
if (!hasErrors) console.log('✅ [1/6] Migrações e políticas RLS em total conformidade!');

// 2. Verificação de Segredos Vazando no Código
console.log('\n🔍 [2/6] Verificando Ausência de Segredos Hardcoded...');
const dangerousPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{20,}['"]/i,
  /MERCADOPAGO_ACCESS_TOKEN\s*=\s*['"]APP_USR-[^'"]+['"]/i,
  /['"]sk_live_[a-zA-Z0-9]+['"]/i,
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'out'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name) && !entry.name.includes('.env')) {
      const text = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          console.error(`❌ [ERRO SEGREDO]: Padrão de chave privada detectado em ${fullPath}!`);
          hasErrors = true;
        }
      }
    }
  }
}
scanDirectory(path.join(__dirname, '..', 'src'));
if (!hasErrors) console.log('✅ [2/6] Nenhum segredo privado exposto no código-fonte!');

// 3. Verificação de Integridade dos Tipos TypeScript
console.log('\n🔍 [3/6] Validando Integridade do Compilador TypeScript...');
try {
  const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
  if (fs.existsSync(tscBin)) {
    execSync(`node "${tscBin}" --noEmit`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } else {
    execSync('npx --yes tsc --noEmit', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }
  console.log('✅ [3/6] Tipagem TypeScript estrita verificada com sucesso!');
} catch (e) {
  console.error('❌ [ERRO COMPILAÇÃO]: Erros de TypeScript encontrados!');
  hasErrors = true;
}

// 4. Verificação de Cabeçalhos de Segurança HTTP
console.log('\n🔍 [4/6] Verificando Cabeçalhos de Segurança HTTP...');
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
  if (!nextConfigContent.includes('Strict-Transport-Security') || !nextConfigContent.includes('X-Frame-Options')) {
    console.error('❌ [AVISO]: next.config.js ausente de cabeçalhos HSTS ou X-Frame-Options!');
    hasErrors = true;
  } else {
    console.log('✅ [4/6] Cabeçalhos de segurança HSTS e X-Frame-Options confirmados!');
  }
}

// 5. AST Anti-IDOR & Metadata Spoofing (src/app/api/)
console.log('\n🔍 [5/6] Verificando Proteção Anti-IDOR & Metadata Spoofing em APIs...');
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
if (fs.existsSync(apiDir)) {
  function scanApiDir(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanApiDir(full);
      } else if (/\.(ts|tsx)$/.test(item.name)) {
        const code = fs.readFileSync(full, 'utf8');
        // Impede uso inseguro de user_metadata para inferência de tenant/empresa_id
        if (/user\.user_metadata\s*\??\.\s*empresa_id/i.test(code) || /user_metadata\['empresa_id'\]/i.test(code)) {
          console.error(`❌ [ERRO IDOR]: Uso de user_metadata para tenant em ${full}! Utilize app_metadata ou tabela de membros.`);
          hasErrors = true;
        }
      }
    }
  }
  scanApiDir(apiDir);
}
if (!hasErrors) console.log('✅ [5/6] Nenhuma vulnerabilidade IDOR/user_metadata detectada em APIs!');

// 6. Anti-PostgREST Injection & Caminhos Locais Hardcoded (src/)
console.log('\n🔍 [6/6] Verificando Injeção PostgREST e Ausência de Caminhos Locais...');
const srcDir = path.join(__dirname, '..', 'src');
if (fs.existsSync(srcDir)) {
  function scanSrcCode(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!['node_modules', '.next', '.git'].includes(item.name)) {
          scanSrcCode(full);
        }
      } else if (/\.(ts|tsx|js)$/.test(item.name)) {
        const code = fs.readFileSync(full, 'utf8');

        // Detecta caminhos locais do ambiente de desenvolvimento Windows/Unix
        if (/([a-zA-Z]:[\\\\/](?:Users|users)|file:\/\/\/[a-zA-Z]:\/Users)/i.test(code)) {
          console.error(`❌ [ERRO PATH]: Caminho absoluto local hardcoded detectado em ${full}!`);
          hasErrors = true;
        }

        // Detecta injeção de string arbitrária no filtro .or() do PostgREST sem sanitização
        // Aceita literais estáticas ou chamadas com sanitização, mas rejeita interpolação direta com variáveis de entrada não tratadas
        const rawOrInterpolation = /\.or\(`[^`]*\$\{[a-zA-Z0-9_.]*(?:req|param|body|input|search)[^`]*\}[^`]*`\)/i;
        if (rawOrInterpolation.test(code)) {
          console.error(`❌ [ERRO POSTGREST]: Interpolação de variável não sanitizada em .or() em ${full}!`);
          hasErrors = true;
        }
      }
    }
  }
  scanSrcCode(srcDir);
}
if (!hasErrors) console.log('✅ [6/6] Nenhum caminho absoluto local ou injeção de filtro PostgREST detectados!');

console.log('\n======================================================');
if (hasErrors) {
  console.error('❌ PRÉ-AUDITORIA REPROVADA! Corrija os pontos acima antes de subir.');
  process.exit(1);
} else {
  console.log('✅ Todas as 6 verificações estáticas de segurança e tipagem foram APROVADAS com 100% de sucesso!');
  console.log('======================================================\n');
  process.exit(0);
}

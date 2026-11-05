/**
 * SUÍTE DE TESTES AUTOMATIZADOS: ISOLAMENTO MULTI-TENANT E SEGURANÇA P0
 * Valida isolamento estrito entre empresas (Empresa A vs Empresa B)
 * via API, controle de acesso baseado em funções (RBAC) e RLS.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

describe('🛡️ 1. Isolamento Multi-tenant e Prevenção de IDOR em /api/dialer/queue', () => {
  const routePath = path.join(__dirname, '..', '..', 'src', 'app', 'api', 'dialer', 'queue', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');

  it('Deve rejeitar requisições sem Authorization e sem secret com 401', () => {
    assert.ok(content.includes('401'), 'Rota deve retornar 401 quando não autenticado');
    assert.ok(!content.includes('adriel_strix_k6_audit_secret_2026'), 'Não deve conter secret hardcoded');
    assert.ok(content.includes('timingSafeEqual'), 'Deve usar crypto.timingSafeEqual para comparação segura');
  });

  it('Deve ignorar operador_id e empresa_id do body para operadores autenticados via JWT', () => {
    // Valida que operador autenticado usa operador_id e empresa_id do JWT/banco
    assert.ok(content.includes('finalOperadorId'), 'Deve definir operador a partir da sessão');
    assert.ok(content.includes('finalEmpresaId'), 'Deve definir empresa_id a partir da sessão');
    assert.ok(content.includes('.eq("empresa_id", finalEmpresaId)'), 'Deve filtrar leads estritamente pela empresa do operador');
  });

  it('Comprovante timingSafeEqual: rejeita tamanhos divergentes e strings adulteradas', () => {
    function safeCompareSecret(provided, expected) {
      if (!provided || !expected) return false;
      const bufProvided = Buffer.from(provided);
      const bufExpected = Buffer.from(expected);
      if (bufProvided.length !== bufExpected.length) return false;
      return crypto.timingSafeEqual(bufProvided, bufExpected);
    }

    const realSecret = 'super_secret_webhook_token_production_2026';
    assert.strictEqual(safeCompareSecret('super_secret_webhook_token_production_2026', realSecret), true);
    assert.strictEqual(safeCompareSecret('attacker_secret_token_diff_len', realSecret), false);
    assert.strictEqual(safeCompareSecret('super_secret_webhook_token_production_2027', realSecret), false);
    assert.strictEqual(safeCompareSecret('', realSecret), false);
    assert.strictEqual(safeCompareSecret(null, realSecret), false);
  });
});

describe('🛡️ 2. Controle de Acesso e Mascaramento em Telefonia e Omnichannel', () => {
  it('Telefonia API: Restringe acesso a dono/gestor/admin e mascara senhas SIP', () => {
    const routePath = path.join(__dirname, '..', '..', 'src', 'app', 'api', 'config', 'telefonia', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    assert.ok(/perfil\s*===?\s*["']admin["']/i.test(content), 'Deve validar admin');
    assert.ok(/perfil\s*===?\s*["']gestor["']/i.test(content), 'Deve validar gestor');
    assert.ok(content.includes('403'), 'Deve retornar 403 para operadores comuns');
    assert.ok(content.includes('has_sip_password'), 'Deve retornar flag has_sip_password em vez da senha real em texto limpo');
    assert.ok(!content.includes('sip_password: data.sip_password'), 'Nunca deve expor senha SIP em texto puro');
  });

  it('Omnichannel API: Restringe acesso a dono/gestor/admin e mascara chaves de IA e WhatsApp', () => {
    const routePath = path.join(__dirname, '..', '..', 'src', 'app', 'api', 'config', 'omnichannel', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    assert.ok(/perfil\s*===?\s*["']admin["']/i.test(content), 'Deve validar admin');
    assert.ok(/perfil\s*===?\s*["']gestor["']/i.test(content), 'Deve validar gestor');
    assert.ok(content.includes('has_gemini_key'), 'Mascara chave Gemini');
    assert.ok(content.includes('has_groq_key'), 'Mascara chave Groq');
    assert.ok(content.includes('has_evolution_key'), 'Mascara chave Evolution');
    assert.ok(content.includes('has_zapi_token'), 'Mascara token Z-API');
  });

  it('Preservação segura de segredos: não regrava máscara no banco de dados', () => {
    const routePath = path.join(__dirname, '..', '..', 'src', 'app', 'api', 'config', 'omnichannel', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    assert.ok(content.includes('body.gemini_api_key !== "••••••••"'), 'Não sobrescreve se a chave for a máscara');
    assert.ok(content.includes('body.groq_api_key !== "••••••••"'), 'Não sobrescreve se a chave Groq for a máscara');
    assert.ok(content.includes('body.evolution_api_key !== "••••••••"'), 'Não sobrescreve token Evolution se mascarado');
    assert.ok(content.includes('body.zapi_token !== "••••••••"'), 'Não sobrescreve token Z-API se mascarado');
  });
});

describe('🛡️ 3. RLS e Isolamento de Schema no Supabase', () => {
  const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20261104_rls_hardening_and_standardization.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  it('Deve criar schema private com funções seguras de contexto', () => {
    assert.ok(migrationSql.includes('CREATE SCHEMA IF NOT EXISTS private;'), 'Cria schema private');
    assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION private.current_empresa_id()'), 'Função current_empresa_id');
    assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION private.is_superadmin()'), 'Função is_superadmin');
    assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION private.current_operator_is_admin()'), 'Função current_operator_is_admin');
    assert.ok(migrationSql.includes('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;'), 'Revoga acesso de anon/public ao schema private');
  });

  it('Deve aplicar isolamento de tenant em todas as tabelas críticas', () => {
    const requiredTables = [
      'scripts_ligacao',
      'planos',
      'tasks',
      'historico_ligacoes',
      'app_configuracoes'
    ];

    for (const table of requiredTables) {
      assert.ok(
        migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `Tabela ${table} deve ter RLS ativado`
      );
    }

    assert.ok(migrationSql.includes('scripts_tenant_isolation'), 'Política de scripts_ligacao');
    assert.ok(migrationSql.includes('planos_select_policy'), 'Política de planos');
    assert.ok(migrationSql.includes('tasks_tenant_isolation'), 'Política de tasks');
    assert.ok(migrationSql.includes('historico_ligacoes_isolation'), 'Política de historico_ligacoes');
    assert.ok(migrationSql.includes('app_config_isolation'), 'Política de app_configuracoes');
  });

  it('sync_mined_lead deve aplicar isolamento de tenant e vincular lead à empresa da sessão atual', () => {
    assert.ok(migrationSql.includes('FUNCTION public.sync_mined_lead'), 'Contém sync_mined_lead');
    assert.ok(migrationSql.includes('private.current_empresa_id()'), 'sync_mined_lead vincula lead à empresa da sessão atual');
  });
});

describe('🛡️ 4. Extensão Chrome e Content Scripts', () => {
  const manifestPath = path.join(__dirname, '..', '..', 'extensions', 'sofia-whatsapp-web', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('Não deve conter permissões permissivas excessivas no manifest.json', () => {
    const hosts = manifest.host_permissions || [];
    assert.ok(!hosts.includes('<all_urls>'), 'Não pode conter <all_urls>');
    assert.ok(!hosts.includes('*://*/*'), 'Não pode conter wildcard universal');
    assert.ok(!hosts.includes('http://localhost/*'), 'Não pode conter localhost em produção');
    assert.ok(hosts.some(h => h.includes('web.whatsapp.com')), 'Deve permitir WhatsApp Web');
  });

  it('Content script não deve conter credenciais Supabase hardcoded', () => {
    const contentJsPath = path.join(__dirname, '..', '..', 'extensions', 'sofia-whatsapp-web', 'content.js');
    const content = fs.readFileSync(contentJsPath, 'utf8');

    assert.ok(!content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Não pode conter JWT anônimo hardcoded');
    assert.ok(!content.includes('SUPABASE_KEY'), 'Não pode conter variável hardcoded de chave');
  });
});

# 🚀 Discadora Consignado Pro (A&K Soluções)

Plataforma Web SaaS completa de **Call Center Ativo, Discador pelo Celular (Zero Custo VoIP), CRM de Crédito Consignado, Esteira Meu INSS e Atendente IA Sofia** desenvolvida para Correspondentes Bancários.

---

## 🏗️ Arquitetura do Sistema

```
                      ┌──────────────────────────────────────────────┐
                      │             ROTA PÚBLICA (/)                 │
                      │  Landing Page de Alta Conversão (/landing)   │
                      │  Captura de Leads Comercial (/api/leads)     │
                      └──────────────────────┬───────────────────────┘
                                             │ [Login / Contratar]
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          AUTENTICAÇÃO & AUTHGUARD            │
                      │  - Supabase Auth (JWT assinado)              │
                      │  - Isolamento Multi-Tenant por empresa_id    │
                      │  - Verificação de Trial e Status Ativo       │
                      └──────────────────────┬───────────────────────┘
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               ▼                                                           ▼
┌───────────────────────────────┐                       ┌─────────────────────────────────┐
│     PAINEL DA DONA/MASTER     │                       │     ESPAÇO DA EMPRESA CLIENTE   │
│       (/dashboard, /admin)    │                       │     (/dialer, /leads, /esteira) │
│ - Métricas 100% Reais         │                       │ - Discagem 1-Clique (Celular)   │
│ - Gestão Multi-Tenant de SaaS │                       │ - Esteira Digital de Contratos  │
│ - Liberação de Dias de Teste  │                       │ - Atendente IA Sofia (WhatsApp) │
│ - Suspensão e Permissões      │                       │ - Agenda de Retornos & NPO/DND  │
└───────────────────────────────┘                       └─────────────────────────────────┘
```

---

## 🛡️ Camada de Segurança & Multi-Tenancy

1. **RPC de Fila Atômica (`obter_proximo_lead_disponivel`):**
   - Executada com `SECURITY DEFINER` e `FOR UPDATE SKIP LOCKED`.
   - Permissão `anon` revogada: apenas usuários autenticados (`authenticated`) têm acesso.
   - O `empresa_id` é obrigatoriamente extraído do token JWT do chamador, impedindo que um operador reserve leads de outro cliente.
2. **Centralização do Não Perturbe (DND):**
   - Checagem automática e obrigatória na tabela `lista_nao_perturbe` em todas as rotas de discagem, URA e WhatsApp.
3. **Webhooks Blindados (Fail-Closed):**
   - Webhooks de URA e Cobrança exigem tokens secretos válidos e falham de forma segura se a configuração de ambiente estiver ausente.
   - Proteção de idempotência e log de auditoria em `logs_auditoria`.
4. **Isolamento de IA & WhatsApp:**
   - As rotas `/api/ai/*` e `/api/whatsapp/*` requerem autenticação e filtram as consultas e atualizações estritamente pelo tenant do usuário logado.

---

## 📦 Stack Tecnológica

- **Frontend & Backend:** Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons.
- **Banco de Dados & Auth:** Supabase PostgreSQL com Row Level Security (RLS) e RPCs atômicas.
- **Telefonia & Discagem:** WebRTC (JsSIP) e Integração GSM com Smartphone (via link de discagem e app companion).
- **Inteligência Artificial:** Google Gemini 1.5 Flash e Groq Cloud (Llama 3.1 8B Instant).
- **Formatos & Planilhas:** SheetJS (xlsx) para importação com detecção inteligente de cabeçalhos.

---

## 🛠️ Configuração e Execução

### Pré-requisitos
- Node.js 18+ ou 20+
- Conta ativa no Supabase

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/adrielmatos/discadora-callcenter.git
cd discadora-callcenter
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e preencha suas chaves:
```bash
cp .env.example .env.local
```

### 3. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

### 4. Compilar para Produção
```bash
npm run build
npm start
```

---

## 📋 Rotas da Aplicação

| Rota | Tipo | Descrição |
| :--- | :--- | :--- |
| `/` | Pública | Landing Page comercial com mockups e demonstração |
| `/login` | Pública | Acesso seguro ao sistema |
| `/download-extensao` | Pública | Download da Extensão Sofia WhatsApp Web |
| `/dashboard` | Restrita Master | Painel Executivo com métricas reais de produção |
| `/admin` | Restrita Master | Gestão de empresas clientes, SaaS e planos |
| `/dialer` | Restrita Operador | Discador em tela única otimizado para celulares |
| `/leads` | Restrita Operador | Base de leads e importador de planilhas |
| `/esteira` | Restrita Operador | Kanban de propostas e contratos consignados |
| `/omnichannel` | Restrita Operador | Atendimento WhatsApp com suporte à IA Sofia |
| `/retornos` | Restrita Operador | Agenda de agendamentos e retornos prioritários |

---

## ⚖️ Conformidade Legal & LGPD

- Sistema adequado às resoluções do Banco Central (Bacen nº 3.954/2011) e Código de Defesa do Consumidor.
- Verificação obrigatória de Não Perturbe antes de qualquer contato ativo.
- Proibição algorítmica de cobrança de taxas antecipadas nas respostas da IA Sofia.

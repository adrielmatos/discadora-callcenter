# Checklist de Variáveis de Ambiente e Segurança Operacional — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Data da Auditoria:** 28 de Outubro de 2026  

---

## 1. Inventário de Variáveis de Ambiente

Todas as variáveis foram catalogadas a partir do código-fonte em `src/**` e do arquivo `.env.example`.

> **REGRA DE SIGILO:**  
> Nenhum token, chave secreta ou credencial real é impresso neste relatório.  
> O checklist especifica a finalidade, escopo de exposição, criticidade e o status de verificação.

| Variável | Escopo | Obrigatoriedade | Finalidade Técnica | Status no Ambiente Local / Staging |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Público (Browser & Server) | **Obrigatória** | URL da instância ativa do Supabase (`https://arcaaeehnxluginzncfs.supabase.co`). | Configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (Browser & Server) | **Obrigatória** | Chave pública anônima. Requer RLS ativo em todas as tabelas. | Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | **Estritamente Servidor** | **Obrigatória** | Chave de serviço com bypass de RLS. Necessária para `/api/leads/landing` e `/api/webhooks/**`. | **AUSENTE (BLOQUEADO)** |
| `NEXT_PUBLIC_APP_URL` | Público (Browser & Server) | Opcional | URL canônica da aplicação para metadados OpenGraph e redirecionamentos. | Configurada (Fallback) |
| `URA_WEBHOOK_SECRET` | **Estritamente Servidor** | Condicional (se usar URA) | Token compartilhado para validar requisições do PABX/URA em `/api/webhooks/ura-dtmf`. | Não Configurada |
| `URA_WEBHOOK_EMPRESA_ID` | **Estritamente Servidor** | Condicional (se usar URA) | UUID do tenant vinculado à URA. Garante isolamento estrito sem aceitar tenant no body/query. | Não Configurada |
| `ADMIN_WEBHOOK_SECRET` | **Estritamente Servidor** | **Obrigatória** | Segredo para autorizar operações administrativas internas e confirmação manual de cobranças. | Não Configurada |
| `GEMINI_API_KEY` | **Estritamente Servidor** | Condicional (se usar IA) | Chave da Google Gemini API para atendimento inteligente da Sofia e análise de conversas. | Não Configurada (Fallback em `app_configuracoes`) |
| `GROQ_API_KEY` | **Estritamente Servidor** | Condicional (se usar IA) | Chave da Groq Cloud para inferência rápida com Llama 3.1. | Não Configurada (Fallback em `app_configuracoes`) |
| `MERCADOPAGO_WEBHOOK_SECRET` | **Estritamente Servidor** | Condicional (se usar MP) | Segredo para validação de assinatura HMAC-SHA256 de notificações do Mercado Pago. | Não Configurada |
| `MERCADOPAGO_ACCESS_TOKEN` | **Estritamente Servidor** | Condicional (se usar MP) | Token comercial do Mercado Pago para consulta de status de pagamentos. | Não Configurada |
| `ASAAS_WEBHOOK_TOKEN` | **Estritamente Servidor** | Condicional (se usar Asaas) | Token de segurança enviado no header `asaas-access-token` pela Asaas. | Não Configurada |
| `EFI_WEBHOOK_SECRET` | **Estritamente Servidor** | Condicional (se usar Efí) | Segredo para validação de webhooks Pix da Efí/Gerencianet. | Não Configurada |

---

## 2. Recomendações de Segurança para Produção (Vercel & Supabase)

1. **Prevenção contra Exposição de Chaves de Serviço:**
   - A variável `SUPABASE_SERVICE_ROLE_KEY` **nunca deve conter o prefixo `NEXT_PUBLIC_`**.
   - Garantir que ela esteja configurada apenas nas variáveis de ambiente de `Production` e `Preview` no painel da Vercel.
   - O arquivo `scripts/security-preflight.js` já valida a ausência de chaves de serviço embutidas no código cliente.

2. **Isolamento de Webhook da URA (`URA_WEBHOOK_EMPRESA_ID`):**
   - No modelo multiempresa, cada central de PABX que enviar eventos para o webhook deve ter sua empresa delimitada pelo backend. A implementação atual utiliza `process.env.URA_WEBHOOK_EMPRESA_ID` no servidor.
   - Caso múltiplas empresas utilizem URAs distintas simultaneamente, o sistema deve evoluir para mapear tokens de autenticação individuais para seus respectivos tenants, sem nunca aceitar o `empresa_id` enviado no corpo ou parâmetros da URL.

3. **Política de Falha Fechada (Fail-Closed):**
   - Os endpoints de webhook implementam falha fechada: caso o token correspondente não esteja configurado no ambiente, a rota recusa a requisição com código `401 Unauthorized` ou `503 Service Unavailable`, impedindo bypass por omissão de configuração.

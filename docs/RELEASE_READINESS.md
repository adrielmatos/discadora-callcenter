# Matriz de Liberação para Produção (Gate Go / No-Go) — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Commit Analisado:** `9dfb1d3b7dfb5688cd90616d2705388656c71b30`  
**Data da Decisão:** 28 de Outubro de 2026  

---

## 1. Parecer Executivo do Gate de Liberação

> ### **PARECER FINAL: ⛔ NÃO LIBERAR PARA PRODUÇÃO**
> 
> O status de compilação da Vercel (`READY`) ou o sucesso do build do Next.js **NÃO ATESTAM** que o software está pronto ou seguro para comercialização pública.  
> Existem bloqueadores críticos de segurança arquitetural, isolamento de dados entre empresas (multitenancy), divergência de schema e dependências de banco que causarão falha sistêmica ou vazamento de dados caso a versão atual seja promovida.

---

## 2. Matriz de Avaliação por Domínio

| Domínio Avaliado | Critério de Aceitação | Resultado | Status |
| :--- | :--- | :--- | :--- |
| **1. Compilação & Build Next.js** | Todas as 29 rotas compilam estaticamente sem erros de sintaxe ou tipos. | `npm run build` gerou todas as páginas com sucesso (código 0). | **PASSOU** |
| **2. Tipagem & Linter** | Ausência de erros bloqueantes de TypeScript ou violações graves de linter. | `npm run lint` passou com código 0 (6 avisos de hooks não impeditivos). | **PASSOU COM AVISOS** |
| **3. Auditoria de Dependências** | CI de segurança (`npm audit --audit-level=high`) sem vulnerabilidades críticas. | 1 vulnerabilidade crítica e 7 altas detectadas. Falha com código 1. | **FALHOU** |
| **4. Landing Page & Navegação** | Rota `/` pública, desacoplada da Sidebar do CRM e sem herdar auth guard. | Implementada com componentes React nativos; `PUBLIC_ROUTES` ativo. | **PASSOU** |
| **5. Isolamento Multitenant no Frontend** | Telas operacionais e administrativas não expõem senhas ou dados globais. | `/telefonia` e `/omnichannel` expõem credenciais globais (`id: 1`) a operadores. | **FALHOU** |
| **6. Políticas RLS do Supabase** | Menor privilégio ativo, sem bypass por políticas permissivas legadas. | Depende de funções inexistentes no schema `private`; políticas antigas ativas. | **FALHOU** |
| **7. Reconciliação de Tabelas** | Nomes de entidades no código conferem com o banco e migrations. | Disparidade: `tasks` vs `crm_tarefas`, `historico_ligacoes` vs `historico_chamadas`. | **FALHOU** |
| **8. Discadora & DND** | RPC atômica (`SKIP LOCKED`), restrição de tenant via JWT e bloqueio DND. | Lógica em `20261011` está blindada, mas requer validação em banco real. | **BLOQUEADO** |
| **9. Webhooks & Cobrança SaaS** | Validação estrita de assinaturas (HMAC), idempotência e falha fechada. | Código blindado (`timingSafeEqual`), mas requer `SUPABASE_SERVICE_ROLE_KEY`. | **BLOQUEADO** |
| **10. Variáveis de Ambiente** | Chaves obrigatórias provisionadas de forma segura sem exposição client. | `SUPABASE_SERVICE_ROLE_KEY` ausente em staging e ambiente local. | **BLOQUEADO** |
| **11. Teste Dinâmico em Staging** | Pentest com múltiplos operadores simulando tentativa de acesso cruzado. | Sem ambiente de homologação autorizado para execução de SQL/RLS. | **BLOQUEADO** |

---

## 3. Lista de Bloqueadores para Promoção a Produção

Para que o sistema receba aprovação (**GO**) para operação comercial, os seguintes passos técnicos devem ser obrigatoriamente concluídos na ordem abaixo:

1. **Reconciliação e Criação do Schema no Supabase de Homologação (Staging):**
   - Criar o schema `private` e implementar as funções:
     - `private.current_role()`
     - `private.current_operator_id()`
     - `private.current_operator_is_admin()`
     - `private.current_operator_active()`
   - Criar a migration formal da RPC `sync_mined_lead`.
   - Unificar a nomenclatura de tabelas: padronizar `tasks` vs `crm_tarefas` e `historico_ligacoes` vs `historico_chamadas`.
   - Adicionar políticas RLS para as tabelas `scripts_ligacao` e `planos`.

2. **Inventário e Revogação de Políticas Legadas (`DROP POLICY`):**
   - Mapear todas as políticas ativas em `pg_policies` e revogar qualquer regra permissiva anterior (`OR true`), assegurando que apenas as políticas de menor privilégio prevaleçam.

3. **Correção de Vazamento de Credenciais em `app_configuracoes`:**
   - Adicionar coluna `empresa_id` em `app_configuracoes`.
   - Remover a leitura direta de senhas SIP (`sip_password`) e chaves de IA no frontend client-side; transferir o processamento para rotas internas de API.
   - Adicionar trava de perfil em `/telefonia` e `/omnichannel` para permitir acesso apenas a `DONO` e `GESTOR`.

4. **Provisionamento de Segredos de Servidor:**
   - Configurar `SUPABASE_SERVICE_ROLE_KEY` com segurança no painel da Vercel (Production/Preview) e nos servidores de webhook.
   - Configurar `URA_WEBHOOK_EMPRESA_ID` e `URA_WEBHOOK_SECRET` para ativação da URA reversa.

5. **Aprovação nos Gates de CI:**
   - Resolver as vulnerabilidades apontadas por `npm audit --audit-level=high`.
   - Executar bateria de testes E2E com dois operadores de empresas diferentes comprovando que nenhum consegue visualizar ou intervir nos leads e conversas do outro.

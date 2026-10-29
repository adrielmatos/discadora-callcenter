# Linha de Base de Versionamento e Auditoria de PRs — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Data da Auditoria:** 28 de Outubro de 2026  

---

## 1. Identificação da Linha de Base Auditada

| Parâmetro | Valor Identificado |
| :--- | :--- |
| **Repositório GitHub** | `adrielmatos/discadora-callcenter` |
| **Branch Ativa de Análise** | `fix/rls-least-privilege-pentest` |
| **Commit HEAD Auditado** | `9dfb1d3b7dfb5688cd90616d2705388656c71b30` |
| **Pull Request Associada** | PR #2 (`https://github.com/adrielmatos/discadora-callcenter/pull/2`) |
| **Estado da Pull Request** | **Aberta (Sem Merge)** |
| **Instância Supabase Vinculada** | `vtwyojpsrjyigsnnfawa` |
| **Vercel Deployment Status** | `READY` para o commit correspondente |

---

## 2. Histórico Recente de Commits na Branch de Trabalho

```text
9dfb1d3 (HEAD -> fix/rls-least-privilege-pentest, origin/fix/rls-least-privilege-pentest)
        security: override vulnerable PostCSS transitive dependencies
8414167 config: require Node 22 for Supabase SDK
23f0d16 fix: escape remaining JSX text quotes
```

---

## 3. Avaliação da Pull Request #2

A Pull Request #2 consolidou os seguintes avanços técnicos:
1. **Correção de Erros de Build e JSX:** Escapamento de aspas e entidades tipográficas que impediam a compilação de páginas como `/download-extensao`.
2. **Definição de Runtime Node.js:** Ajuste de `package.json` para `"node": ">=22.0.0"`, prevenindo falhas de compilação da SDK do Supabase em ambientes legacy.
3. **Proposta de Migração de Menor Privilégio:** Adição do arquivo `supabase/migrations/20261028_rls_least_privilege.sql`.
4. **Isolamento de Layout na Landing Page:** Inclusão de `PUBLIC_ROUTES` no `AuthGuard` e `AppShell`, desacoplando a Landing Page pública da barra lateral do CRM.

### Motivos para Manter a PR #2 Aberta (Sem Merge):
- A migração `20261028_rls_least_privilege.sql` depende de funções do schema `private` que não foram aplicadas ao banco de dados.
- Há divergência de nomes de tabelas entre o frontend (`tasks`, `historico_ligacoes`) e a migration (`crm_tarefas`, `historico_chamadas`).
- A aplicação da migração em produção sem reconciliação prévia causará bloqueio imediato do acesso dos operadores (negação de serviço).
- O comando `npm audit --audit-level=high` configurado na CI da PR falha com código 1.

---

## 4. Política de Promoção para Produção

1. **Vedação de Merge Antecipado:** Nenhum merge de `fix/rls-least-privilege-pentest` para a branch `main` deve ocorrer antes que:
   - A reconciliação de schema seja executada em ambiente de homologação (staging).
   - O schema `private` e as funções utilitárias sejam criadas no Supabase.
   - A suíte de testes E2E multi-tenant comprove o isolamento entre empresas.
2. **Preservação de Integridade:** As alterações de auditoria e relatórios técnicos devem ser versionadas na pasta `docs/` mantendo rastreabilidade total.

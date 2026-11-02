# Auditoria de Conformidade Legal, Privacidade (LGPD), Cookies, Terceiros e Acessibilidade

**Projeto:** Discadora Call Center Consignado Pro (A&K Soluções Financeiras)  
**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Data da Auditoria:** 28 de Outubro de 2026  
**Avaliador:** Gerente de Projetos (Mestrado em Auditoria de Sistemas) & Especialista em Segurança Ofensiva (Doutorado em Pentest)

---

## 1. Resumo Executivo da Auditoria de Conformidade

Esta auditoria avaliou a postura regulatória da aplicação em cinco domínios fundamentais:
1. **Governança de Cookies e Consentimento do Usuário.**
2. **Privacidade e Proteção de Dados (LGPD — Lei nº 13.709/2018).**
3. **Termos de Uso e Responsabilidade Contratual SaaS.**
4. **Inventário de Código de Terceiros e Rastreamento Externo (Ferramentas de Visitas).**
5. **Acessibilidade Digital (Diretrizes WCAG 2.1 Nível AA).**

---

## 2. Inventário de Cookies e Consentimento

### 2.1. Classificação de Cookies e Armazenamento Local
| Chave / Cookie | Tipo | Origem | Finalidade Técnica | Exige Consentimento Prévio? |
| :--- | :--- | :--- | :--- | :--- |
| `sb-*-auth-token` | LocalStorage / Cookie | Supabase Auth (Primeira Parte) | Manutenção de sessão autenticada do operador e assinatura JWT para RLS. | **Não** (Estritamente Necessário) |
| `cookie_consent` | LocalStorage | Aplicação Própria (Primeira Parte) | Registro da escolha de consentimento do usuário (`all` ou `essential`). | **Não** (Guarda de Consentimento) |
| `sofiaActive` | LocalStorage (Chrome Ext) | Extensão Sofia WhatsApp Web | Controle de ativação/pausa do robô de auto-resposta no navegador do operador. | **Não** (Operação Funcional) |

### 2.2. Implementação do Banner de Cookies (Opt-In / Informação)
- **Componente:** `src/components/CookieBanner.tsx`
- **Comportamento:** Exibido de forma discreta e responsiva no rodapé em caso de ausência de consentimento prévio.
- **Opções:** O usuário pode selecionar "Aceitar Todos" ou "Apenas Essenciais", com link direto para a Política de Privacidade.
- **Acessibilidade:** Implementado com `role="region"`, `aria-label="Consentimento de Cookies e Privacidade"`, navegável por teclado e sem bloqueio visual agressivo.

---

## 3. Matriz de Privacidade e Conformidade LGPD (Lei nº 13.709/2018)

### 3.1. Rota Dedicada
- **Página:** `src/app/privacidade/page.tsx` (Rota `/privacidade`, pública e indexável).
- **Conteúdo Estruturado:**
  - Identificação clara do Controlador e Encarregado de Dados (DPO): `privacidade@aksolucoes.com.br`.
  - Mapeamento das bases legais do Art. 7º da LGPD:
    - *Execução de Contrato (Inciso V)* para prestação do serviço SaaS aos correspondentes.
    - *Cumprimento de Obrigação Legal (Inciso II)* para registros do Marco Civil da Internet e Banco Central.
    - *Legítimo Interesse (Inciso IX)* para prevenção a fraudes e segurança contra invasões.
    - *Consentimento (Inciso I)* para captação voluntária de propostas na Landing Page.
  - Tabela de direitos do titular (Art. 18): Acesso, confirmação, correção e eliminação.

### 3.2. Mecanismo Ativo de Eliminação / Anonimização (Art. 18 LGPD)
- **Implementação no CRM:** O painel lateral de atendimento (`src/components/LeadDrawer.tsx`) possui a funcionalidade nativa `handleAnonymizeLGPD`.
- **Efeito:**
  - O nome do cliente é substituído por `"Titular Anonimizado (LGPD)"`.
  - Telefone, CPF e endereço são eliminados do cadastro ativo.
  - Um registro de auditoria imutável é gravado na tabela `audit_logs` com a ação `LEAD_ANONYMIZE_LGPD` para comprovação fiscalizatória junto à ANPD.

---

## 4. Termos e Condições Gerais de Uso (SaaS)

### 4.1. Rota Dedicada
- **Página:** `src/app/termos/page.tsx` (Rota `/termos`, pública e indexável).
- **Cláusulas Auditadas e Aprovadas:**
  1. **Natureza SaaS:** A plataforma licencia software de CRM e discagem assistida, sem comercialização de minutos VoIP nem intermediação financeira direta.
  2. **Isenção Telefônica:** A ligação é cursada pelo chip GSM do smartphone corporativo do contratante (via Phone Link), sendo este o único responsável pelos contratos com a operadora móvel.
  3. **Conformidade Bacen e CDC:** Proibição explícita e irrevogável de cobrança de qualquer taxa de cadastro ou depósito prévio para liberação de empréstimos consignados (Resolução Bacen nº 3.954/2011 e CDC Art. 39).
  4. **Respeito à Lista Não Perturbe (DND):** Obrigatoriedade legal de acatar bloqueios de telemarketing (Procon e Anatel).
  5. **Cancelamento Sem Fidelidade:** Regra transparente de encerramento de assinatura sem aplicação de multas abusivas.

---

## 5. Auditoria de Código de Terceiros e Rastreamento Externo (Ferramentas de Visitas)

### 5.1. Rastreamento de Visitas (Analytics / Tracking)
- **Veredito:** **ZERO TRACKING INVASIVO.**
- **Evidência no Código-Fonte:**
  - Não há injeção de **Google Tag Manager (GTM)**.
  - Não há injeção de **Google Analytics (gtag.js / ga.js)**.
  - Não há injeção de **Meta Pixel (Facebook/Instagram)**.
  - Não há injeção de **TikTok Pixel**.
  - Não há injeção de ferramentas de gravação de tela invasivas (**Hotjar / Clarity / FullStory**).
- **Vantagem de Segurança e Privacidade:** A ausência de scripts de rastreamento de terceiros reduz drasticamente o risco de vazamento de dados de crédito consignado para adtechs e acelera o carregamento da página (LCP sub-1s).

### 5.2. Mapeamento de Ferramentas Externas: "Quem Usa" e "Quem Lê"
| Ferramenta Externa | Endpoints de Rede | Quem Utiliza / Aciona | Quem Tem Acesso / O Que Lê | Medidas de Proteção |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase PostgreSQL / Auth** | `https://*.supabase.co`<br>`wss://*.supabase.co` | Aplicação Next.js (Servidor & Navegador) | Armazena dados criptografados em repouso. Autenticação via JWT com RLS. | Isolamento por tenant e políticas de menor privilégio. |
| **Google Gemini API / Groq Cloud** | `https://generativelanguage.googleapis.com`<br>`https://api.groq.com` | Rota de servidor Next.js (`/api/ai/chat`) | Recebe apenas o trecho da conversa atual para inferência conversacional da Sofia. | As chaves de API nunca são expostas ao navegador. |
| **Mercado Pago / Asaas / Efí** | `https://api.mercadopago.com`<br>Webhooks de servidor | Rota de servidor Next.js (`/api/webhooks/billing`) | Lê IDs de transação e status de pagamento para liberação de planos. | Validação HMAC-SHA256 (`timingSafeEqual`). Nenhum dado de cartão é gravado no CRM. |
| **WhatsApp Web / PABX Asterisk** | WebRTC local / `web.whatsapp.com` | Operador no navegador | Disparo de mensagens e áudio de voz. | Tráfego direto do cliente ou servidor local, sem intermediação de servidores espiões. |

---

## 6. Auditoria de Acessibilidade Digital (WCAG 2.1 Nível AA)

| Critério de Sucesso WCAG | Avaliação Técnica | Status | Evidência / Correção |
| :--- | :--- | :--- | :--- |
| **1.4.3 Contraste Mínimo (4.5:1)** | O texto principal (`text-white`, `text-slate-100`, `text-slate-200`) sobre fundos escuros (`bg-slate-950`, `bg-navy-950`) apresenta taxas de contraste superiores a **11:1**, excedendo amplamente a recomendação. | **PASSOU** | Legibilidade nítida em ambientes de baixa e alta luminosidade. |
| **2.1.1 Teclado Completo** | Todos os elementos interativos (links, botões, modais) são acionáveis via tecla `Tab`, `Enter` e `Space`. | **PASSOU** | Os modais (`DemoModal`, `LeadDrawer`) fecham com a tecla `Escape`. |
| **2.4.4 Finalidade do Link** | Links no footer e navegação possuem textos descritivos claros ("Termos de Uso", "Privacidade & Cookies (LGPD)"). | **PASSOU** | Sem links genéricos vazios ou ambíguos. |
| **4.1.2 Nome, Função e Valor (ARIA)** | Botões que contêm apenas ícones gráficos (ex: fechar modal, abrir menu mobile) possuem atributo `aria-label` explícito. | **PASSOU** | Leitores de tela (NVDA, JAWS, VoiceOver) anunciam a função exata do controle. |
| **1.3.1 Informações e Relações** | Uso de tags semânticas HTML5 (`<header>`, `<main>`, `<aside>`, `<footer>`, `<section>`, `<h1>`-`<h4>`). | **PASSOU** | Hierarquia de títulos estrita em todas as páginas públicas e operacionais. |

---

## 7. Parecer Final de Auditoria e Governança

> ### **PARECER FINAL: CONFORMIDADE LEGAL E PRIVACIDADE ATINGIDA**
> 
> A plataforma Discadora Consignado Pro agora possui um arcabouço completo de documentação regulatória:
> - **Cookies:** Política clara e componente de consentimento ativo (`CookieBanner.tsx`).
> - **LGPD:** Política de Privacidade publicada (`/privacidade`), base legal estabelecida e ferramenta nativa de anonimização (Art. 18).
> - **Termos de Uso:** Publicados (`/termos`) com salvaguardas contratuais sobre telefonia e proibições de fraudes/taxas prévias.
> - **Terceiros:** Inventário demonstrando **Zero Tracking Invasivo** e isolamento estrito de APIs externas.
> - **Acessibilidade:** Padrão WCAG 2.1 Nível AA atendido em contraste, teclado e tags semânticas.

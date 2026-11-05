export const siteConfig = {
  name: "AK Soluções Financeiras",
  tagline: "CRM & Discador pelo Celular para Crédito Consignado",
  description:
    "A única discadora desenvolvida especificamente para correspondentes de crédito consignado. Zero custo de telefonia VoIP (disque direto pelo chip do celular via PC), esteira Meu INSS, simulador de margem e esteira de anuência blindada.",
  url: "https://discadora-callcenter.vercel.app",
  systemLoginUrl: "https://discadora-callcenter.vercel.app/login",
  whatsappNumber: "5579981052664",
  whatsappDefaultMessage:
    "Olá! Gostaria de agendar uma demonstração gratuita e conhecer os planos da AK Soluções Financeiras.",
  
  metrics: [
    { label: "Custo por Minuto Falado", value: "R$ 0,00", desc: "Usa o plano ilimitado do seu chip" },
    { label: "Operação Direta no Celular", value: "100% Chip", desc: "Conexão direta com planos de operadoras móveis" },
    { label: "Economia em Telefonia", value: "Zero VoIP", desc: "Elimina tarifas por minuto e servidores caros" },
    { label: "Conversão no WhatsApp", value: "Imediata", desc: "Transbordo 1-clique para formalização" },
  ],

  launchVideo: {
    src: "/videos/discadora-launch.mp4",
    poster: "/videos/discadora-poster.jpg",
    durationSeconds: 18,
    scenes: [
      {
        id: "desafio",
        label: "O Desafio",
        timeRange: "00s – 04s",
        start: 0,
        end: 4,
        title: "Fim das contas abusivas de VoIP e discagem manual lenta",
        desc: "Correspondentes gastando fortunas em tarifas por minuto e operadores perdendo tempo.",
      },
      {
        id: "revelacao",
        label: "A Revelação",
        timeRange: "04s – 08s",
        start: 4,
        end: 8,
        title: "Chegada da Discadora Consignado Pro",
        desc: "A revolução Phone Link que transforma o chip do celular em discador sem custo VoIP.",
      },
      {
        id: "poder",
        label: "Poder Operacional",
        timeRange: "08s – 14s",
        start: 8,
        end: 14,
        title: "Discagem GSM 1-Clique + IA Sofia + Esteira Meu INSS",
        desc: "Abertura instantânea de chamadas pelo chip do celular e qualificação com Sofia AI.",
      },
      {
        id: "escala",
        label: "Escala Máxima",
        timeRange: "14s – 18s",
        start: 14,
        end: 18,
        title: "A&K Soluções Financeiras em Ação",
        desc: "Operações dobrando produção com zero investimento em infraestrutura cara.",
      },
    ],
  },

  screenshots: [
    {
      id: "dashboard",
      title: "Painel Executivo",
      tag: "Tempo Real",
      desc: "Visão 360º de leads, contatos, taxas de conversão e colaboradores ativos.",
      src: "/mockups/dashboard.png"
    },
    {
      id: "dialer",
      title: "Discador pelo celular & Softphone",
      tag: "Zero VoIP",
      desc: "Discagem contínua via chip celular ou WebRTC com script dinâmico e quebra de objeções ao vivo.",
      src: "/mockups/dialer.png"
    },
    {
      id: "leads",
      title: "CRM & Funil Kanban",
      tag: "8 Etapas",
      desc: "Pipeline completo com filtros avançados, Sofia AI e esteira de formalização.",
      src: "/mockups/leads.png"
    },
    {
      id: "tasks",
      title: "Tarefas & Produtividade",
      tag: "Follow-up",
      desc: "Gestão diária de pendências, lembretes de contato e tarefas dos operadores.",
      src: "/mockups/tasks.png"
    },
    {
      id: "retornos",
      title: "Agenda de Retornos",
      tag: "Sincronizada",
      desc: "Rechamadas agendadas com disparos automáticos e integração ao WhatsApp.",
      src: "/mockups/retornos.png"
    },
    {
      id: "scripts",
      title: "Catálogo de Scripts",
      tag: "Multicanal",
      desc: "Roteiros segmentados por produto (FGTS, INSS, SIAPE, Portabilidade) e argumentação rápida.",
      src: "/mockups/scripts.png"
    },
    {
      id: "resultados",
      title: "Resultados & Métricas",
      tag: "Performance",
      desc: "Auditoria analítica, tempo médio de atendimento e ranking de vendas.",
      src: "/mockups/resultados.png"
    }
  ],

  plans: [
    {
      id: "iniciante",
      name: "Iniciante / Individual",
      subtitle: "Para operadores autônomos ou início de operação",
      price: "49.90",
      period: "/mês",
      highlight: false,
      badge: "Comece Hoje",
      features: [
        "1 Operador ativo simultâneo",
        "Discagem ilimitada via celular (Phone Link)",
        "Zero custo de minutos VoIP ou tarifas",
        "CRM com Ficha do Lead 360º",
        "Simulador básico de margem INSS",
        "Importador de planilhas de leads",
        "Suporte por e-mail e comunidade",
      ],
      ctaText: "Começar Individual",
      ctaType: "whatsapp",
    },
    {
      id: "pro",
      name: "Equipe Pro",
      subtitle: "O plano mais escolhido por Correspondentes Bancários",
      price: "179.90",
      period: "/mês",
      highlight: true,
      badge: "Mais Vendido • Melhor Custo-Benefício",
      features: [
        "Até 5 Operadores simultâneos",
        "Discagem ilimitada em todos os postos",
        "Zero cobrança de minutos ou tarifas",
        "Esteira de Anuência Meu INSS com alerta de prazo",
        "Simulador de Margem & Bloqueador de Recusa",
        "Roteiro interativo com quebra de objeções ao vivo",
        "Cadência e Rediscagem inteligente (rechamada por horário)",
        "Suporte prioritário via WhatsApp",
      ],
      ctaText: "Assinar Equipe Pro",
      ctaType: "whatsapp",
    },
    {
      id: "enterprise",
      name: "Operação Escala",
      subtitle: "Para promotoras médias e grandes com esteiras ativas",
      price: "349.90",
      period: "/mês",
      highlight: false,
      badge: "Alta Performance",
      features: [
        "Operadores ilimitados (consulte postos)",
        "Tudo do plano Equipe Pro",
        "Gestão Multi-Campanha avançada",
        "Relatórios de auditoria e conformidade LGPD",
        "Lista de Bloqueio Não Perturbe integrada",
        "Treinamento de onboarding para a equipe",
        "Gerente de conta exclusivo",
      ],
      ctaText: "Falar com Consultor",
      ctaType: "whatsapp",
    },
  ],

  comparisons: [
    {
      feature: "Custo por Minuto Falado",
      ourSystem: "R$ 0,00 (Chip Celular Ilimitado)",
      traditional: "R$ 0,08 a R$ 0,25 por minuto tarifado",
      winner: "our",
    },
    {
      feature: "Bloqueio de SPAM / Operadora",
      ourSystem: "Risco Mínimo (Número móvel real identificado)",
      traditional: "Alto (Rotas VoIP tradicionais bloqueadas)",
      winner: "our",
    },
    {
      feature: "Esteira de Anuência Meu INSS",
      ourSystem: "Nativa com contagem regressiva de expiração",
      traditional: "Inexistente (Discador genérico)",
      winner: "our",
    },
    {
      feature: "Simulador de Margem em Linha",
      ourSystem: "Integrado na tela durante a chamada",
      traditional: "Planilha externa ou sistema do banco aberto",
      winner: "our",
    },
    {
      feature: "Quebra de Objeções ao Vivo",
      ourSystem: "Cartões de resposta rápida a 1 clique",
      traditional: "Treinamento em PDF separado",
      winner: "our",
    },
    {
      feature: "Rediscagem por Tipo de Tabulação",
      ourSystem: "Intervalo e horário inteligente por tabulação",
      traditional: "Rechamada cega e sem inteligência de horário",
      winner: "our",
    },
    {
      feature: "Fidelidade e Multa de Rescisão",
      ourSystem: "Zero fidelidade. Cancele quando quiser",
      traditional: "Contratos anuais com multas pesadas",
      winner: "our",
    },
  ],

  faqs: [
    {
      question: "Como funciona a discagem sem custo de VoIP?",
      answer:
        "Utilizamos a tecnologia de conexão com seu smartphone (Phone Link / Vincular ao Celular). O operador controla todo o CRM, ficha do lead e botão 'Discar' direto pelo computador, e a ligação é disparada pelo chip GSM ilimitado do celular da sua operadora (Vivo, Claro, TIM, etc.). Você nunca paga por minutos ou pacotes de telefonia.",
    },
    {
      question: "Funciona tanto com Android quanto com iPhone?",
      answer:
        "Sim! O aplicativo suporta integração nativa com aparelhos Android e também iPhone via Bluetooth / Phone Link no Windows 10 e Windows 11.",
    },
    {
      question: "O que é a Esteira de Anuência Meu INSS?",
      answer:
        "É um funil visual exclusivo onde cada proposta registrada recebe um prazo limite de anuência. Se o cliente demorar para autorizar no aplicativo do INSS, o sistema emite alertas prioritários para o operador ligar e não deixar a proposta expirar.",
    },
    {
      question: "Posso importar minhas próprias listas de clientes?",
      answer:
        "Com certeza! O sistema conta com importador inteligente de planilhas (Excel ou CSV). Ele mapeia automaticamente colunas como Nome, CPF, Telefone, Margem, Benefício e Banco.",
    },
    {
      question: "Existe contrato de fidelidade ou carência?",
      answer:
        "Não! Você assina mensalmente e pode cancelar a qualquer momento sem nenhuma taxa ou multa de rescisão.",
    },
    {
      question: "Como começo a usar na minha operação?",
      answer:
        "Basta clicar em qualquer botão de 'Falar no WhatsApp' ou 'Testar 7 Dias Grátis'. Nosso time comercial configura seu acesso e você começa a rodar sua equipe em menos de 15 minutos.",
    },
  ],
};

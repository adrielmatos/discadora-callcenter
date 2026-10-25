/**
 * Sofia AI - Assistente de Crédito & CRM para WhatsApp Web Oficial (v1.2.0)
 * Opera diretamente na interface legítima do WhatsApp Web
 * Compatível com arquitetura moderna do WhatsApp Web (React 18 / Lexical / Virtual DOM)
 */

(function () {
  let isSofiaActive = true;
  let crmBaseUrl = "https://discadora-callcenter.vercel.app";
  let lastProcessedMessage = "";
  let isAnswering = false;
  let isBatchMining = false;
  const pausedChats = new Set(); // Chats pausados por transbordo humano

  console.log("[Sofia AI v1.2.0] Extensão iniciada no WhatsApp Web.");

  // Carrega configurações salvas no chrome.storage
  if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["sofiaActive", "crmUrl"], (data) => {
      if (data.sofiaActive !== undefined) isSofiaActive = data.sofiaActive;
      if (data.crmUrl) crmBaseUrl = data.crmUrl.replace(/\/$/, "");
      renderFloatingWidget();
    });
  } else {
    renderFloatingWidget();
  }

  // Ouve mensagens vindas do popup da extensão
  if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === "SET_SOFIA_STATUS") {
        isSofiaActive = req.active;
        updateFloatingWidget();
        sendResponse({ success: true, active: isSofiaActive });
      } else if (req.action === "MINE_ACTIVE_CHAT") {
        mineActiveChat().then((result) => sendResponse(result));
        return true; // async
      } else if (req.action === "MINE_ALL_CHATS") {
        mineAllChats().then((result) => sendResponse(result));
        return true; // async
      }
    });
  }

  // Toast de notificação persistente e visual dentro do WhatsApp Web
  function showInAppNotification(msg, isError = false) {
    let toast = document.getElementById("sofia-notification-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "sofia-notification-toast";
      document.body.appendChild(toast);
    }

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      background: ${isError ? "#881337" : "#064e3b"};
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border: 1px solid ${isError ? "#f43f5e" : "#10b981"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      max-width: 420px;
      line-height: 1.4;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
      transform: translateY(0);
    `;
    toast.textContent = msg;

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 4500);
  }

  // Gera telefone virtual consistente caso o contato esteja salvo apenas por nome
  function generateDeterministicPhone(name) {
    let hash = 0;
    const str = String(name || "cliente_whatsapp").trim().toLowerCase();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const posHash = Math.abs(hash) % 90000000;
    return `55119${String(posHash).padStart(8, "0")}`;
  }

  // Dispara cliques com ponteiro simulando interação humana exata (compatível com React 18)
  function simulateRealPointerClick(element) {
    if (!element) return;
    try {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {}

    const rect = element.getBoundingClientRect();
    const clientX = rect.left + Math.max(10, rect.width / 2);
    const clientY = rect.top + Math.max(10, rect.height / 2);

    const eventList = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    for (const type of eventList) {
      const isPointer = type.startsWith("pointer");
      const EventClass = isPointer && window.PointerEvent ? window.PointerEvent : MouseEvent;
      const ev = new EventClass(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: clientX,
        clientY: clientY,
        buttons: 1,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true
      });
      element.dispatchEvent(ev);
    }
  }

  // Extrai nome e última mensagem diretamente do card lateral no #pane-side
  function extractSidebarCardData(item) {
    if (!item) return null;

    let name = "";
    let lastSnippet = "";

    // 1. Título do contato
    const titleEl = item.querySelector(
      "span[data-testid='cell-frame-title'] span, " +
      "div[data-testid='cell-frame-title'] span, " +
      "span[title], " +
      "span[dir='auto']"
    );
    if (titleEl) {
      name = (titleEl.getAttribute("title") || titleEl.innerText || "").trim();
    }

    // 2. Prévia da última mensagem
    const snippetEl = item.querySelector(
      "span[data-testid='last-msg-status'] ~ span, " +
      "span.selectable-text, " +
      "span[dir='ltr'], " +
      "div[data-testid='cell-frame-secondary'] span"
    );
    if (snippetEl) {
      lastSnippet = (snippetEl.getAttribute("title") || snippetEl.innerText || "").trim();
    } else {
      // Pega todos os spans e pega o mais longo que não seja o nome
      const allSpans = Array.from(item.querySelectorAll("span"));
      for (const s of allSpans) {
        const txt = (s.innerText || "").trim();
        if (txt && txt !== name && txt.length > 3 && !txt.match(/^\d{1,2}:\d{2}$/)) {
          lastSnippet = txt;
          break;
        }
      }
    }

    if (!name && !lastSnippet) return null;

    const digits = (name || "").replace(/\D/g, "");
    const finalPhone = digits.length >= 8 ? digits : generateDeterministicPhone(name || "Contato");
    const finalName = name || `Cliente WhatsApp (${finalPhone.slice(-4)})`;

    return {
      name: finalName,
      phone: finalPhone,
      snippet: lastSnippet || "Conversa ativa no WhatsApp Web"
    };
  }

  // Detecta informações do contato ativo na tela aberta (#main)
  function getActiveContactInfo() {
    let name = "";
    let phone = "";

    const mainPanel = document.querySelector("#main");
    if (!mainPanel) {
      // Se #main não estiver aberto, tenta verificar se algum card está selecionado na lateral
      const selectedSidebarItem = document.querySelector(
        "#pane-side div[aria-selected='true'], " +
        "#pane-side div[data-testid='cell-frame-container'][class*='active']"
      );
      if (selectedSidebarItem) {
        const cardData = extractSidebarCardData(selectedSidebarItem);
        if (cardData) return cardData;
      }
      return null;
    }

    // 1. Inspeciona o cabeçalho do painel #main
    const chatHeader = mainPanel.querySelector("header");
    if (chatHeader) {
      const titleEl = chatHeader.querySelector(
        "span[data-testid='conversation-info-header-chat-title'], " +
        "div[role='button'] span[dir='auto'], " +
        "h2, " +
        "span[dir='auto'][title], " +
        "span[title], " +
        "span[dir='auto']"
      );
      if (titleEl) {
        const rawTitle = (titleEl.getAttribute("title") || titleEl.innerText || "").trim();
        if (rawTitle && !rawTitle.toLowerCase().includes("online") && !rawTitle.toLowerCase().includes("visto por")) {
          name = rawTitle;
        }
      }

      // Procura número explícito no subtítulo (ex: "+55 11 98765-4321")
      const subTitleEl = chatHeader.querySelector("span[title*='+'], span[title*='55'], span[dir='auto']:not(:first-child)");
      if (subTitleEl) {
        const text = subTitleEl.innerText || subTitleEl.getAttribute("title") || "";
        const digits = text.replace(/\D/g, "");
        if (digits.length >= 10 && digits.startsWith("55")) {
          phone = digits;
        }
      }
    }

    // 2. Extrai telefone internacional diretamente das mensagens do #main
    if (!phone) {
      const msgNodes = mainPanel.querySelectorAll("div[data-id]");
      for (const msg of Array.from(msgNodes)) {
        const dataId = msg.getAttribute("data-id") || "";
        const match = dataId.match(/_(\d{10,15})@(c\.us|s\.whatsapp\.net)/);
        if (match && match[1]) {
          phone = match[1];
          break;
        }
      }
    }

    // 3. Se o nome for o próprio número de telefone
    const digitsInName = (name || "").replace(/\D/g, "");
    if (digitsInName.length >= 10 && !phone) {
      phone = digitsInName;
    }

    // Se encontramos nome ou telefone, finaliza com dados válidos
    if (name || phone) {
      const finalPhone = phone || (digitsInName.length >= 8 ? digitsInName : generateDeterministicPhone(name));
      const finalName = name || `Cliente (${finalPhone.slice(-4)})`;
      return { name: finalName, phone: finalPhone };
    }

    return null;
  }

  // Extrai mensagens da conversa atual no painel #main
  function extractActiveChatMessages() {
    const messages = [];
    const mainPanel = document.querySelector("#main");
    if (!mainPanel) return messages;

    const messageNodes = mainPanel.querySelectorAll(
      "div[data-id], " +
      "div[data-testid='msg-container'], " +
      "div[role='row'], " +
      "div[class*='message-in'], " +
      "div[class*='message-out'], " +
      ".message-in, " +
      ".message-out"
    );

    messageNodes.forEach((node) => {
      const textEl = node.querySelector(
        ".copyable-text span, " +
        ".selectable-text, " +
        "[data-testid='selectable-text'], " +
        "span[dir='ltr'], " +
        "span[dir='auto']"
      );
      if (!textEl) return;

      const text = (textEl.innerText || "").trim();
      if (!text || text.length < 2) return;

      const dataId = node.getAttribute("data-id") || "";
      const isOut = (
        dataId.startsWith("true_") ||
        node.className.includes("message-out") ||
        !!node.querySelector("span[data-icon*='check'], [data-testid*='check']")
      );

      messages.push({
        sender: isOut ? "me" : "client",
        text: text
      });
    });

    // Fallback: se nenhum nó estruturado foi encontrado, captura textos do container
    if (messages.length === 0) {
      const textElements = mainPanel.querySelectorAll("span.selectable-text, span[dir='auto']");
      textElements.forEach((el) => {
        const t = (el.innerText || "").trim();
        if (t && t.length > 3 && !t.includes("Online") && !t.includes("digitando") && !t.includes("visto por")) {
          messages.push({ sender: "client", text: t });
        }
      });
    }

    return messages;
  }

  // Envia dados de conversa para a API da Discadora (com fallback direto de alta resiliência para o Supabase)
  const SUPABASE_REST_URL = "https://arcaaeehnxluginzncfs.supabase.co/rest/v1/rpc/sync_mined_lead";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY2FhZWVobnhsdWdpbnpuY2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDMwNzEsImV4cCI6MjEwNjQ3OTA3MX0.sesEcB-EF3yCGa0b84xQ-56kEchoryt4c5sNqm4sup0";

  async function sendChatToApi(phone, name, messages, chatSnippet = "") {
    let apiData = null;

    // 1. Tenta via API da Discadora (Next.js / Vercel com IA Gemini)
    try {
      const payload = {
        clientPhone: phone,
        clientName: name,
        messages: Array.isArray(messages) && messages.length > 0 ? messages.slice(-25) : undefined,
        chatText: chatSnippet || undefined,
        empresaId: "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3"
      };

      const response = await fetch(`${crmBaseUrl}/api/ai/analyze-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        apiData = await response.json();
        if (apiData && apiData.leadId) {
          return { success: true, data: apiData };
        }
      }
    } catch (err) {
      console.warn("[Sofia AI] Falha na rota /api/ai/analyze-chat, acionando fallback direto Supabase:", err);
    }

    // 2. Fallback Direto Supabase REST (Garante que o lead NUNCA seja perdido no CRM)
    try {
      const allText = Array.isArray(messages) && messages.length > 0
        ? messages.map((m) => m.text).join(" ")
        : (chatSnippet || "");
      const lower = allText.toLowerCase();

      let produto = "FGTS Saque-Aniversário";
      let temperatura = "Morno";
      let etapa = "Interessado";

      if (lower.includes("inss") || lower.includes("benefício") || lower.includes("aposent")) {
        produto = "Consignado INSS";
      } else if (lower.includes("portabilidade") || lower.includes("troco")) {
        produto = "Portabilidade com Troco";
      }

      if (lower.includes("quero") || lower.includes("simular") || lower.includes("cpf") || lower.includes("liberar") || lower.includes("saldo")) {
        temperatura = "Quente";
        etapa = "Simulação";
      }

      const rpcBody = {
        p_client_phone: phone,
        p_client_name: name,
        p_produto: apiData?.analysis?.produto || produto,
        p_banco: apiData?.analysis?.banco_atual || "Banco Parceiro",
        p_margem: apiData?.analysis?.valor_ou_margem || "R$ 0,00",
        p_etapa: etapa,
        p_tabulacao: `[Mineração WhatsApp] ${temperatura}: ${produto}`,
        p_resumo: apiData?.analysis?.resumo || `Lead resgatado no WhatsApp com interesse em ${produto}.`,
        p_sugestao: apiData?.analysis?.sugestao_abordagem || "Contatar cliente hoje para confirmação de proposta.",
        p_temperatura: temperatura,
        p_empresa_id: "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3"
      };

      const supaRes = await fetch(SUPABASE_REST_URL, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(rpcBody)
      });

      if (supaRes.ok) {
        const supaData = await supaRes.json();
        return {
          success: true,
          data: {
            success: true,
            leadId: supaData?.lead_id,
            analysis: {
              produto: rpcBody.p_produto,
              temperatura: rpcBody.p_temperatura,
              resumo: rpcBody.p_resumo
            }
          }
        };
      }
    } catch (supaErr) {
      console.error("[Sofia AI] Erro no fallback Supabase:", supaErr);
    }

    return { success: false, error: "Falha ao sincronizar com CRM e Banco" };
  }

  // Minera o histórico da conversa atualmente aberta
  async function mineActiveChat(silent = false) {
    let contact = getActiveContactInfo();
    let messages = extractActiveChatMessages();

    // Se não encontrou no #main, tenta pegar do primeiro card ou card ativo
    if (!contact) {
      const firstItem = document.querySelector(
        "#pane-side div[role='listitem'], " +
        "#pane-side div[data-testid='cell-frame-container'], " +
        "#pane-side div[tabindex='-1']"
      );
      if (firstItem) {
        const cardData = extractSidebarCardData(firstItem);
        if (cardData) {
          contact = { name: cardData.name, phone: cardData.phone };
          messages = [{ sender: "client", text: cardData.snippet }];
        }
      }
    }

    if (!contact) {
      const err = "Nenhuma conversa detectada. Clique em um contato na barra lateral do WhatsApp Web antes de minerar.";
      if (!silent) showInAppNotification(err, true);
      return { success: false, error: err };
    }

    const snippet = messages.length === 0 ? "Conversa ativa no WhatsApp" : "";
    const res = await sendChatToApi(contact.phone, contact.name, messages, snippet);

    if (!res.success) {
      const errMsg = "Erro ao sincronizar com CRM: " + res.error;
      if (!silent) showInAppNotification(errMsg, true);
      return { success: false, error: errMsg };
    }

    const successMsg = `🎉 ${contact.name} qualificado no CRM! [${res.data?.analysis?.temperatura || "Morno"} - ${res.data?.analysis?.produto || "Crédito"}].`;
    if (!silent) showInAppNotification(successMsg);

    // Atualiza contador no chrome.storage
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["leadsSyncedCount"], (store) => {
        const current = (store.leadsSyncedCount || 0) + 1;
        chrome.storage.local.set({ leadsSyncedCount: current });
      });
    }

    return {
      success: true,
      message: successMsg,
      data: res.data
    };
  }

  // Minera todas as conversas visíveis na barra lateral em lote (Varredura Automática)
  async function mineAllChats() {
    if (isBatchMining) {
      showInAppNotification("A varredura automática já está em andamento!", true);
      return { success: false, message: "Varredura em andamento" };
    }

    // Seleciona todas as conversas listadas na barra lateral com ampla compatibilidade de seletores
    let chatItems = Array.from(document.querySelectorAll(
      "#pane-side div[role='listitem'], " +
      "#pane-side div[data-testid='cell-frame-container'], " +
      "#pane-side div[tabindex='-1'][role='row'], " +
      "#pane-side div[role='row']"
    ));

    // Fallback de seleção lateral caso seletores padrão estejam diferentes
    if (chatItems.length === 0) {
      const paneSide = document.querySelector("#pane-side");
      if (paneSide) {
        chatItems = Array.from(paneSide.querySelectorAll("div[tabindex='-1']"));
      }
    }

    if (!chatItems || chatItems.length === 0) {
      showInAppNotification("Nenhuma conversa encontrada na barra lateral do WhatsApp Web.", true);
      return { success: false, error: "Nenhuma conversa encontrada." };
    }

    isBatchMining = true;
    const totalToMine = Math.min(chatItems.length, 30); // Até 30 conversas por rodada
    showInAppNotification(`🚀 Iniciando varredura inteligente de ${totalToMine} conversas...`);

    let successCount = 0;

    for (let i = 0; i < totalToMine; i++) {
      if (!isBatchMining) break;

      const item = chatItems[i];
      try {
        // 1. Extrai imediatamente dados prévios do card lateral (garante que nada seja perdido)
        const cardData = extractSidebarCardData(item);
        const contactName = cardData?.name || `Contato ${i + 1}`;
        const contactPhone = cardData?.phone || generateDeterministicPhone(contactName);
        const initialSnippet = cardData?.snippet || "";

        showInAppNotification(`⏳ [${i + 1}/${totalToMine}] Analisando ${contactName}...`);

        // 2. Dispara evento de clique humanizado com ponteiro no elemento clicável
        const clickable = item.querySelector("div[role='button'], div[tabindex='-1'], [data-testid='cell-frame-container']") || item;
        simulateRealPointerClick(clickable);

        // 3. Aguarda 1.2 segundos para verificar se o painel #main carregou as mensagens completas
        await new Promise((resolve) => setTimeout(resolve, 1200));

        let messages = [];
        let finalPhone = contactPhone;
        let finalName = contactName;

        const activeContact = getActiveContactInfo();
        if (activeContact) {
          finalName = activeContact.name || finalName;
          finalPhone = activeContact.phone || finalPhone;
          messages = extractActiveChatMessages();
        }

        // Se o painel não carregou mensagens, usa o snippet capturado no card lateral
        if (messages.length === 0 && initialSnippet) {
          messages = [{ sender: "client", text: initialSnippet }];
        }

        // 4. Envia para a API da Discadora Sofia AI
        const apiRes = await sendChatToApi(finalPhone, finalName, messages, initialSnippet);

        if (apiRes.success) {
          successCount++;
          const temp = apiRes.data?.analysis?.temperatura || "Morno";
          const prod = apiRes.data?.analysis?.produto || "FGTS";
          showInAppNotification(`✅ [${i + 1}/${totalToMine}] ${finalName} salvo no CRM! [${temp} - ${prod}]`);
        } else {
          console.warn(`[Sofia AI] Falha ao enviar ${finalName} ao CRM:`, apiRes.error);
        }

      } catch (err) {
        console.warn(`[Sofia AI] Erro durante mineração do item ${i + 1}:`, err);
      }

      // Intervalo cadenciado entre contatos para proteger a conexão
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    isBatchMining = false;
    const summary = `🎉 Varredura finalizada! ${successCount} de ${totalToMine} conversas qualificadas e sincronizadas no CRM!`;
    showInAppNotification(summary);

    // Atualiza contagem global
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["leadsSyncedCount"], (store) => {
        const current = (store.leadsSyncedCount || 0) + successCount;
        chrome.storage.local.set({ leadsSyncedCount: current });
      });
    }

    return {
      success: true,
      message: summary,
      syncedCount: successCount
    };
  }

  // Simula digitação humana no campo de mensagem do WhatsApp Web
  function sendWhatsAppMessage(text) {
    const input = document.querySelector(
      "#main footer div[contenteditable='true'], " +
      "div[contenteditable='true'][data-tab='10'], " +
      "div[data-lexical-editor='true'], " +
      "footer div[contenteditable='true']"
    );
    if (!input) return false;

    input.focus();
    document.execCommand("insertText", false, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));

    setTimeout(() => {
      const sendButton = document.querySelector(
        'button[aria-label="Enviar"], ' +
        'button[data-tab="11"], ' +
        'span[data-icon="send"]'
      )?.closest("button");

      if (sendButton) {
        sendButton.click();
      } else {
        const enterDown = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, keyCode: 13, which: 13 });
        input.dispatchEvent(enterDown);
      }
    }, 450);

    return true;
  }

  // Resposta automática da Sofia no piloto automático
  async function checkForIncomingMessages() {
    if (!isSofiaActive || isAnswering || isBatchMining) return;

    const contact = getActiveContactInfo();
    if (!contact) return;

    if (pausedChats.has(contact.name) || pausedChats.has(contact.phone)) return;

    const mainPanel = document.querySelector("#main");
    if (!mainPanel) return;

    const messageNodes = mainPanel.querySelectorAll("div[data-id], div[class*='message-in'], div[class*='message-out'], .message-in, .message-out");
    if (messageNodes.length === 0) return;

    const lastMsgNode = messageNodes[messageNodes.length - 1];
    const dataId = lastMsgNode.getAttribute("data-id") || "";
    const isClient = dataId.startsWith("false_") || lastMsgNode.className.includes("message-in");
    if (!isClient) return;

    const textEl = lastMsgNode.querySelector(".selectable-text, .copyable-text, span[dir='ltr'], span[dir='auto']");
    if (!textEl) return;

    const text = (textEl.innerText || "").trim();
    if (!text || text === lastProcessedMessage) return;

    lastProcessedMessage = text;
    isAnswering = true;

    // Simula tempo de digitação humana (2 a 3.5 segundos)
    const humanDelay = 2000 + Math.floor(Math.random() * 1500);

    setTimeout(async () => {
      try {
        const res = await fetch(`${crmBaseUrl}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            clientPhone: contact.phone,
            clientName: contact.name,
            autoSync: true,
            empresaId: "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3"
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            sendWhatsAppMessage(data.reply);

            if (data.isHandoff) {
              pausedChats.add(contact.name);
              if (contact.phone) pausedChats.add(contact.phone);
              showInAppNotification(`⚠️ [Transbordo] ${contact.name} solicitou especialista. Sofia pausada para este contato.`);
            }

            if (window.chrome && chrome.storage && chrome.storage.local) {
              chrome.storage.local.get(["repliedCount"], (store) => {
                const count = (store.repliedCount || 0) + 1;
                chrome.storage.local.set({ repliedCount: count });
              });
            }
          }
        }
      } catch (err) {
        console.error("[Sofia AI] Erro ao responder:", err);
      } finally {
        isAnswering = false;
      }
    }, humanDelay);
  }

  // Injeta Widget Flutuante no topo do WhatsApp Web
  function renderFloatingWidget() {
    if (document.getElementById("sofia-floating-widget")) return;
    if (!document.body) return;

    const widget = document.createElement("div");
    widget.id = "sofia-floating-widget";
    widget.style.cssText = `
      position: fixed;
      top: 12px;
      right: 80px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      color: #f8fafc;
      padding: 5px 12px;
      border-radius: 20px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.35);
      border: 1px solid #10b981;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      user-select: none;
    `;

    widget.innerHTML = `
      <div id="sofia-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></div>
      <span id="sofia-status-text" style="font-weight: 700; cursor: pointer; color: #f8fafc; margin-right: 2px;" title="Clique para pausar ou ligar a Sofia">Sofia Ativa</span>
      <button id="sofia-btn-mine" style="
        background: #1e293b;
        color: #38bdf8;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
      " title="Analisa o histórico do cliente aberto e sincroniza com o CRM">⚡ Minerar</button>
      <button id="sofia-btn-mine-all" style="
        background: #1e293b;
        color: #34d399;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
      " title="Varre automaticamente todas as conversas da lista lateral">🔍 Varrer Todas</button>
      <button id="sofia-btn-crm" style="
        background: #1e293b;
        color: #c084fc;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
      " title="Abrir CRM da Discadora em nova aba">📊 CRM</button>
    `;

    document.body.appendChild(widget);

    // Eventos do widget
    const statusText = widget.querySelector("#sofia-status-text");
    statusText.addEventListener("click", () => {
      isSofiaActive = !isSofiaActive;
      updateFloatingWidget();
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ sofiaActive: isSofiaActive });
      }
    });

    const crmBtn = widget.querySelector("#sofia-btn-crm");
    if (crmBtn) {
      crmBtn.addEventListener("click", () => {
        window.open(crmBaseUrl + "/leads", "_blank");
      });
    }

    const mineBtn = widget.querySelector("#sofia-btn-mine");
    mineBtn.addEventListener("click", async () => {
      mineBtn.textContent = "⏳ Analisando...";
      mineBtn.disabled = true;
      const res = await mineActiveChat();
      mineBtn.textContent = "⚡ Minerar";
      mineBtn.disabled = false;
    });

    const mineAllBtn = widget.querySelector("#sofia-btn-mine-all");
    if (mineAllBtn) {
      mineAllBtn.addEventListener("click", async () => {
        await mineAllChats();
      });
    }
  }

  function updateFloatingWidget() {
    const dot = document.getElementById("sofia-status-dot");
    const text = document.getElementById("sofia-status-text");
    if (!dot || !text) return;

    if (isSofiaActive) {
      dot.style.background = "#10b981";
      dot.style.boxShadow = "0 0 8px #10b981";
      text.textContent = "Sofia Ativa";
      text.style.color = "#f8fafc";
    } else {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 8px #f59e0b";
      text.textContent = "Sofia Pausada";
      text.style.color = "#cbd5e1";
    }
  }

  // Observador de mutações no WhatsApp Web
  const observer = new MutationObserver(() => {
    checkForIncomingMessages();
  });

  function startObserver() {
    const appEl = document.querySelector("#app");
    if (appEl) {
      observer.observe(appEl, { childList: true, subtree: true });
      setInterval(checkForIncomingMessages, 2500);
      renderFloatingWidget();

      setInterval(() => {
        if (!document.getElementById("sofia-floating-widget") && document.body) {
          renderFloatingWidget();
        }
      }, 3000);
    } else {
      setTimeout(startObserver, 1000);
    }
  }

  if (document.body) {
    renderFloatingWidget();
  }

  startObserver();
})();

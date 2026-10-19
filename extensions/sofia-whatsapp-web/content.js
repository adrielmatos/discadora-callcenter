/**
 * Sofia AI - Assistente de Crédito & CRM para WhatsApp Web Oficial (v1.1.0)
 * Opera diretamente na interface legítima do WhatsApp Web
 * Compatível com novas atualizações de layout do WhatsApp Web (2024-2026)
 */

(function () {
  let isSofiaActive = true;
  let crmBaseUrl = "https://discadora-callcenter.vercel.app";
  let lastProcessedMessage = "";
  let isAnswering = false;
  let isBatchMining = false;
  const pausedChats = new Set(); // Chats pausados por transbordo humano

  console.log("[Sofia AI] Extensão iniciada no WhatsApp Web.");

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
      padding: 5px 10px;
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
      if (res.success) {
        showInAppNotification(res.message);
      } else {
        showInAppNotification(res.error, true);
      }
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

  // Notificação toast dentro do WhatsApp Web
  function showInAppNotification(msg, isError = false) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      background: ${isError ? "#7f1d1d" : "#064e3b"};
      color: #fff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.4);
      border: 1px solid ${isError ? "#ef4444" : "#10b981"};
      font-family: sans-serif;
      font-size: 13px;
      font-weight: 500;
      max-width: 400px;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s";
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // Helper com 5 camadas de fallback para identificar o contato ativo no WhatsApp Web
  function getActiveContactInfo() {
    let name = "";
    let phone = "";

    // Camada 1: Procura o cabeçalho da conversa aberta
    const header = document.querySelector(
      "#main header, " +
      "header[data-testid='conversation-header'], " +
      "div[data-testid='conversation-panel-wrapper'] header, " +
      "div[role='region'] header, " +
      "#main > div > header, " +
      "div[data-testid='chat'] header"
    );

    if (header) {
      const titleEl = header.querySelector(
        "span[data-testid='conversation-info-header-chat-title'], " +
        "span[dir='auto'][title], " +
        "span[title], " +
        "div[role='button'] span[dir='auto'], " +
        "span[dir='auto']"
      );
      if (titleEl) {
        name = (titleEl.getAttribute("title") || titleEl.innerText || "").trim();
      }

      // Procura número explícito no subtítulo (ex: "+55 11 98765-4321")
      const subTitleEl = header.querySelector("span[title*='+'], span[title*='55'], span[dir='auto']");
      if (subTitleEl) {
        const text = subTitleEl.innerText || subTitleEl.getAttribute("title") || "";
        const digits = text.replace(/\D/g, "");
        if (digits.length >= 10 && digits.startsWith("55")) {
          phone = digits;
        }
      }
    }

    // Camada 2: Conversa selecionada na barra lateral (#pane-side)
    if (!name || !phone) {
      const activeSideItem = document.querySelector(
        "#pane-side div[aria-selected='true'], " +
        "#pane-side div[data-testid='cell-frame-container'][class*='active'], " +
        "#pane-side div[tabindex='0'][role='listitem']"
      );
      if (activeSideItem) {
        const sideTitle = activeSideItem.querySelector("span[title], span[dir='auto']");
        if (!name && sideTitle) {
          name = (sideTitle.getAttribute("title") || sideTitle.innerText || "").trim();
        }
      }
    }

    // Camada 3: Extrai o telefone internacional diretamente do atributo data-id das mensagens
    // Padrão do WhatsApp Web: false_5511999998888@c.us_3EB0... ou true_5511999998888@c.us_...
    if (!phone) {
      const msgWithDataId = document.querySelector("div[data-id*='@c.us']");
      if (msgWithDataId) {
        const dataId = msgWithDataId.getAttribute("data-id") || "";
        const match = dataId.match(/_(\d{10,15})@c\.us/);
        if (match && match[1]) {
          phone = match[1];
        }
      }
    }

    // Camada 4: Se o nome for o próprio número de telefone
    const digitsInName = name.replace(/\D/g, "");
    if (digitsInName.length >= 10 && !phone) {
      phone = digitsInName;
    }

    if (!name && !phone) {
      console.warn("[Sofia AI] Não foi possível detectar o contato ativo na tela.");
      return null;
    }

    const finalPhone = phone || (digitsInName.length >= 8 ? digitsInName : "550000000000");
    const finalName = name || `Cliente (${finalPhone.slice(-4)})`;

    console.log(`[Sofia AI] Contato ativo identificado: ${finalName} (${finalPhone})`);
    return { name: finalName, phone: finalPhone };
  }

  // Extrai mensagens da conversa atual com suporte universal ao DOM moderno do WhatsApp
  function extractActiveChatMessages() {
    const messages = [];

    // Busca elementos de mensagem por múltiplos seletores possíveis
    const messageNodes = document.querySelectorAll(
      "div[data-id], " +
      "div[data-testid='msg-container'], " +
      "div[role='row'], " +
      "div[class*='message-in'], " +
      "div[class*='message-out'], " +
      ".message-in, " +
      ".message-out"
    );

    messageNodes.forEach((node) => {
      // Ignora divisores de data ('Hoje', 'Ontem', etc.)
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

      // Determina se a mensagem é do cliente ou do operador
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

    // Fallback: se nenhum nó estruturado foi encontrado, captura parágrafos do container central
    if (messages.length === 0) {
      const panel = document.querySelector("#main, div[data-testid='conversation-panel-body'], div[role='region']");
      if (panel) {
        const textElements = panel.querySelectorAll("span.selectable-text, span[dir='auto']");
        textElements.forEach((el) => {
          const t = (el.innerText || "").trim();
          if (t && t.length > 3 && !t.includes("Online") && !t.includes("digitando") && !t.includes("visto por último")) {
            messages.push({ sender: "client", text: t });
          }
        });
      }
    }

    console.log(`[Sofia AI] Total de mensagens extraídas: ${messages.length}`);
    return messages;
  }

  // Minera o histórico da conversa atualmente aberta
  async function mineActiveChat(silent = false) {
    const contact = getActiveContactInfo();
    if (!contact) {
      return { 
        success: false, 
        error: "Nenhuma conversa detectada. Clique em um contato na barra lateral do WhatsApp Web antes de minerar." 
      };
    }

    const messages = extractActiveChatMessages();
    if (messages.length === 0) {
      return { 
        success: false, 
        error: `Não foram encontradas mensagens legíveis na conversa com ${contact.name}. Envie ou aguarde uma mensagem.` 
      };
    }

    try {
      console.log(`[Sofia AI] Enviando ${messages.length} mensagens de ${contact.name} para análise...`);
      const response = await fetch(`${crmBaseUrl}/api/ai/analyze-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPhone: contact.phone,
          clientName: contact.name,
          messages: messages.slice(-25) // Analisa até as últimas 25 mensagens
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: "Erro na API da Sofia: " + err };
      }

      const data = await response.json();
      const successMsg = `🎉 Mineração concluída! ${contact.name} sincronizado no CRM como [${data.analysis?.produto || "Crédito"} - ${data.analysis?.temperatura || "Morno"}].`;
      
      if (!silent) {
        showInAppNotification(successMsg);
      }

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
        data
      };
    } catch (e) {
      return { success: false, error: "Falha de conexão com a Discadora: " + e.message };
    }
  }

  // Minera todas as conversas visíveis na barra lateral em lote (Varredura Automática)
  async function mineAllChats() {
    if (isBatchMining) {
      showInAppNotification("A varredura automática já está em andamento!", true);
      return { success: false, message: "Varredura em andamento" };
    }

    // Seleciona as conversas listadas na barra lateral
    const chatItems = document.querySelectorAll(
      "#pane-side div[role='listitem'], " +
      "#pane-side div[data-testid='cell-frame-container'], " +
      "#pane-side div[tabindex='-1'][role='row'], " +
      "#pane-side div[role='row']"
    );

    if (!chatItems || chatItems.length === 0) {
      showInAppNotification("Nenhuma conversa visível encontrada na barra lateral.", true);
      return { success: false, error: "Nenhuma conversa na barra lateral." };
    }

    isBatchMining = true;
    const totalToMine = Math.min(chatItems.length, 25); // Até 25 conversas por rodada para não travar
    showInAppNotification(`🚀 Iniciando varredura em lote de ${totalToMine} conversas...`);

    let successCount = 0;

    for (let i = 0; i < totalToMine; i++) {
      if (!isBatchMining) break;

      const item = chatItems[i];
      try {
        // Clica na conversa para abri-la
        item.click();
        showInAppNotification(`⏳ [${i + 1}/${totalToMine}] Analisando conversa...`);

        // Aguarda 1.2 segundos para as mensagens carregarem no painel
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const res = await mineActiveChat(true);
        if (res && res.success) {
          successCount++;
        }
      } catch (err) {
        console.warn(`[Sofia AI] Erro ao minerar item ${i + 1}:`, err);
      }

      // Intervalo cadenciado entre conversas
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    isBatchMining = false;
    const summary = `🎉 Varredura finalizada! ${successCount} de ${totalToMine} conversas qualificadas e enviadas ao CRM.`;
    showInAppNotification(summary);

    return {
      success: true,
      message: summary
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

  // Verifica e processa mensagens recebidas na conversa aberta
  async function checkForIncomingMessages() {
    if (!isSofiaActive || isAnswering || isBatchMining) return;

    const contact = getActiveContactInfo();
    if (!contact) return;

    if (pausedChats.has(contact.name) || pausedChats.has(contact.phone)) return;

    const messageNodes = document.querySelectorAll("div[data-id], div[class*='message-in'], div[class*='message-out'], .message-in, .message-out");
    if (messageNodes.length === 0) return;

    const lastMsgNode = messageNodes[messageNodes.length - 1];

    // Verifica se a última mensagem foi enviada pelo cliente
    const dataId = lastMsgNode.getAttribute("data-id") || "";
    const isClient = dataId.startsWith("false_") || lastMsgNode.className.includes("message-in");
    if (!isClient) return;

    const textEl = lastMsgNode.querySelector(".selectable-text, .copyable-text, span[dir='ltr'], span[dir='auto']");
    if (!textEl) return;

    const text = (textEl.innerText || "").trim();
    if (!text || text === lastProcessedMessage) return;

    lastProcessedMessage = text;
    isAnswering = true;

    // Aguarda entre 2 a 4 segundos simulando tempo de digitação humano
    const humanDelay = 2000 + Math.floor(Math.random() * 2000);

    setTimeout(async () => {
      try {
        const res = await fetch(`${crmBaseUrl}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            clientPhone: contact.phone,
            clientName: contact.name,
            autoSync: true
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            sendWhatsAppMessage(data.reply);

            if (data.isHandoff) {
              pausedChats.add(contact.name);
              if (contact.phone) pausedChats.add(contact.phone);
              showInAppNotification(`⚠️ [Transbordo Humano] ${contact.name} solicitou especialista. Sofia pausada para este contato.`);
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
        console.error("[Sofia AI] Erro ao responder mensagem:", err);
      } finally {
        isAnswering = false;
      }
    }, humanDelay);
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

      // Garante que o widget permaneça visível mesmo após trocas de rotas no WhatsApp Web
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

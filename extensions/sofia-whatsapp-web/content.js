/**
 * Sofia AI - Assistente de Crédito & CRM para WhatsApp Web Oficial
 * Opera diretamente na interface legítima do WhatsApp Web
 */

(function () {
  let isSofiaActive = true;
  let crmBaseUrl = "https://discadora-callcenter.vercel.app";
  let lastProcessedMessage = "";
  let isAnswering = false;
  const pausedChats = new Set(); // Chats pausados por transbordo humano

  // Carrega configurações iniciais
  if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["sofiaActive", "crmUrl"], (data) => {
      if (data.sofiaActive !== undefined) isSofiaActive = data.sofiaActive;
      if (data.crmUrl) crmBaseUrl = data.crmUrl.replace(/\/$/, "");
      renderFloatingWidget();
    });
  } else {
    renderFloatingWidget();
  }

  // Ouve mensagens vindas do popup
  if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === "SET_SOFIA_STATUS") {
        isSofiaActive = req.active;
        updateFloatingWidget();
        sendResponse({ success: true, active: isSofiaActive });
      } else if (req.action === "MINE_ACTIVE_CHAT") {
        mineActiveChat().then((result) => sendResponse(result));
        return true; // async response
      }
    });
  }

  // Injeta Widget Flutuante no WhatsApp Web
  function renderFloatingWidget() {
    if (document.getElementById("sofia-floating-widget")) return;

    const widget = document.createElement("div");
    widget.id = "sofia-floating-widget";
    widget.style.cssText = `
      position: fixed;
      top: 12px;
      right: 75px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 1px solid #10b981;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      user-select: none;
    `;

    widget.innerHTML = `
      <div id="sofia-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></div>
      <span id="sofia-status-text" style="font-weight: 600; cursor: pointer;">Sofia Ativa</span>
      <button id="sofia-btn-mine" style="
        background: #1e293b;
        color: #38bdf8;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
      " title="Analisa o histórico deste cliente e sincroniza com o CRM">⚡ Minerar</button>
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
        showInAppNotification("Aviso: " + res.error, true);
      }
    });
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

  // Notificação visual toast dentro do WhatsApp Web
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
      max-width: 380px;
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

  // Helper para obter dados do contato atual aberto no WhatsApp Web
  function getActiveContactInfo() {
    const mainHeader = document.querySelector("#main header");
    if (!mainHeader) return null;

    // Nome ou número no cabeçalho
    const titleEl = mainHeader.querySelector("span[dir='auto'][title], span[title]");
    const name = titleEl ? (titleEl.getAttribute("title") || titleEl.innerText) : "Cliente";

    // Extrai dígitos se for número de telefone direto no título
    const cleanDigits = name.replace(/\D/g, "");
    let phone = cleanDigits.length >= 8 ? cleanDigits : "";

    // Se o título for um nome de contato salvo (ex: "Maria"), tenta buscar no avatar ou atributos
    if (!phone) {
      const img = mainHeader.querySelector("img[src*='whatsapp.net'], img[src*='dyn']");
      const subTitleEl = mainHeader.querySelector("span[title*='+'], span[title*='55']");
      if (subTitleEl) {
        phone = subTitleEl.innerText.replace(/\D/g, "");
      }
    }

    // Se ainda não tiver telefone direto, usa o nome do contato como identificador seguro
    return { name, phone: phone || name.replace(/[^a-zA-Z0-9]/g, "") };
  }

  // Minerar histórico da conversa ativa
  async function mineActiveChat() {
    const contact = getActiveContactInfo();
    if (!contact) {
      return { success: false, error: "Nenhuma conversa selecionada no WhatsApp Web." };
    }

    // Coleta mensagens visíveis na conversa
    const messageNodes = document.querySelectorAll("#main .message-in, #main .message-out");
    if (messageNodes.length === 0) {
      return { success: false, error: "Nenhuma mensagem encontrada nesta conversa para minerar." };
    }

    const messages = [];
    messageNodes.forEach((node) => {
      const isClient = node.classList.contains("message-in");
      const textEl = node.querySelector(".selectable-text, span[dir='ltr'], span[dir='auto']");
      if (textEl && textEl.innerText.trim()) {
        messages.push({
          sender: isClient ? "client" : "me",
          text: textEl.innerText.trim()
        });
      }
    });

    if (messages.length === 0) {
      return { success: false, error: "Nenhum texto pôde ser extraído desta conversa." };
    }

    try {
      const response = await fetch(`${crmBaseUrl}/api/ai/analyze-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPhone: contact.phone || "550000000000",
          clientName: contact.name,
          messages: messages.slice(-20) // Analisa até as últimas 20 mensagens
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: "Erro na API da Sofia: " + err };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Mineração concluída! Lead ${contact.name} enviado ao CRM como [${data.analysis?.produto || "Crédito"}].`
      };
    } catch (e) {
      return { success: false, error: "Falha de conexão com a Discadora: " + e.message };
    }
  }

  // Simula digitação humana no campo de mensagem do WhatsApp Web
  function sendWhatsAppMessage(text) {
    const input = document.querySelector("#main footer div[contenteditable='true'], div[contenteditable='true'][data-tab='10'], div[data-lexical-editor='true']");
    if (!input) return false;

    input.focus();
    // Insere o texto através do comando de edição nativo do navegador
    document.execCommand("insertText", false, text);

    // Dispara eventos de input para o WhatsApp Web habilitar o botão de envio
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Simula um intervalo humano de 400ms antes do envio
    setTimeout(() => {
      const sendButton = document.querySelector('button[aria-label="Enviar"], button[data-tab="11"], span[data-icon="send"]')?.closest("button");
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
    if (!isSofiaActive || isAnswering) return;

    const contact = getActiveContactInfo();
    if (!contact) return;

    // Se este chat foi pausado por transbordo humano, ignora resposta automática
    if (pausedChats.has(contact.name) || pausedChats.has(contact.phone)) return;

    // Localiza a última mensagem do chat ativo
    const messages = document.querySelectorAll("#main .message-in, #main .message-out");
    if (messages.length === 0) return;

    const lastMsgNode = messages[messages.length - 1];

    // Só responde se a ÚLTIMA mensagem foi enviada pelo CLIENTE (message-in)
    if (!lastMsgNode.classList.contains("message-in")) return;

    const textEl = lastMsgNode.querySelector(".selectable-text, span[dir='ltr'], span[dir='auto']");
    if (!textEl) return;

    const text = textEl.innerText.trim();
    if (!text || text === lastProcessedMessage) return;

    // Bloqueia para não responder duplicado
    lastProcessedMessage = text;
    isAnswering = true;

    // Simula digitação: aguarda entre 2 a 4 segundos como um humano
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

            // Se for transbordo humano, pausa este chat
            if (data.isHandoff) {
              pausedChats.add(contact.name);
              if (contact.phone) pausedChats.add(contact.phone);
              showInAppNotification(`⚠️ [Transbordo Humano] ${contact.name} solicitou especialista. Sofia pausada para este contato.`);
            }

            // Atualiza estatísticas locais
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

  // Observer contínuo para detectar novas mensagens
  const observer = new MutationObserver(() => {
    checkForIncomingMessages();
  });

  // Inicia o observador assim que o container do WhatsApp estiver pronto
  function startObserver() {
    const appEl = document.querySelector("#app");
    if (appEl) {
      observer.observe(appEl, { childList: true, subtree: true });
      setInterval(checkForIncomingMessages, 2500);
      renderFloatingWidget();
    } else {
      setTimeout(startObserver, 1000);
    }
  }

  startObserver();
})();

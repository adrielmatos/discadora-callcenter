document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("sofiaActiveToggle");
  const crmUrlInput = document.getElementById("crmUrlInput");
  const btnSave = document.getElementById("btnSaveConfig");
  const btnMine = document.getElementById("btnMineCurrentChat");
  const btnOpenCrm = document.getElementById("btnOpenCrm");
  const repliedCount = document.getElementById("repliedCount");
  const leadsSyncedCount = document.getElementById("leadsSyncedCount");
  const statusBadge = document.getElementById("statusBadge");

  // Carrega configurações salvas
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["sofiaActive", "crmUrl", "repliedCount", "leadsSyncedCount"], (data) => {
      if (data.sofiaActive !== undefined) {
        toggle.checked = data.sofiaActive;
      }
      if (data.crmUrl) {
        crmUrlInput.value = data.crmUrl;
      }
      if (data.repliedCount !== undefined) {
        repliedCount.textContent = data.repliedCount;
      }
      if (data.leadsSyncedCount !== undefined) {
        leadsSyncedCount.textContent = data.leadsSyncedCount;
      }
      updateStatusBadge(toggle.checked);
    });
  }

  function updateStatusBadge(active) {
    if (active) {
      statusBadge.textContent = "Sofia Ativa";
      statusBadge.style.background = "#064e3b";
      statusBadge.style.color = "#34d399";
      statusBadge.style.borderColor = "#059669";
    } else {
      statusBadge.textContent = "Pausada";
      statusBadge.style.background = "#451a03";
      statusBadge.style.color = "#fbbf24";
      statusBadge.style.borderColor = "#d97706";
    }
  }

  // Toggle Sofia ON/OFF
  toggle.addEventListener("change", () => {
    const isActive = toggle.checked;
    updateStatusBadge(isActive);
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sofiaActive: isActive });
    }
    // Notifica content script na aba ativa do WhatsApp Web
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SET_SOFIA_STATUS", active: isActive });
      }
    });
  });

  // Salvar configurações
  btnSave.addEventListener("click", () => {
    const crmUrl = crmUrlInput.value.trim().replace(/\/$/, "");
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ crmUrl }, () => {
        btnSave.textContent = "✓ Salvo com Sucesso!";
        btnSave.style.background = "#059669";
        setTimeout(() => {
          btnSave.textContent = "Salvar Configuração";
          btnSave.style.background = "#334155";
        }, 2000);
      });
    }
  });

  // Minerar Conversa Aberta
  btnMine.addEventListener("click", () => {
    btnMine.textContent = "⏳ Analisando Conversa...";
    btnMine.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes("web.whatsapp.com")) {
        alert("Abra o WhatsApp Web oficial (web.whatsapp.com) e clique em uma conversa para minerar.");
        btnMine.textContent = "⚡ Minerar e Enviar para CRM";
        btnMine.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: "MINE_ACTIVE_CHAT" }, (response) => {
        btnMine.disabled = false;
        btnMine.textContent = "⚡ Minerar e Enviar para CRM";
        if (response && response.success) {
          alert("🎉 " + response.message);
          // Incrementa contador
          if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(["leadsSyncedCount"], (data) => {
              const current = (data.leadsSyncedCount || 0) + 1;
              chrome.storage.local.set({ leadsSyncedCount: current });
              leadsSyncedCount.textContent = current;
            });
          }
        } else {
          alert("Aviso: " + (response?.error || "Certifique-se de que uma conversa do WhatsApp está aberta na tela."));
        }
      });
    });
  });

  // Abrir WhatsApp Web
  const btnOpenWhatsApp = document.getElementById("btnOpenWhatsApp");
  if (btnOpenWhatsApp) {
    btnOpenWhatsApp.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://web.whatsapp.com" });
    });
  }

  // Abrir CRM
  btnOpenCrm.addEventListener("click", () => {
    const url = (crmUrlInput.value.trim() || "https://discadora-callcenter.vercel.app") + "/leads";
    chrome.tabs.create({ url });
  });

  // Abrir Disparo Cadenciado
  const btnStartBroadcast = document.getElementById("btnStartBroadcast");
  if (btnStartBroadcast) {
    btnStartBroadcast.addEventListener("click", () => {
      const url = (crmUrlInput.value.trim() || "https://discadora-callcenter.vercel.app") + "/leads";
      chrome.tabs.create({ url });
    });
  }
});

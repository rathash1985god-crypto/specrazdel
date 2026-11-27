// petr_widget.js — Живой чат нейропродавца Петра для сайта specrazdel56.ru
(function () {
  if (window.__petrWidgetLoaded) return;
  window.__petrWidgetLoaded = true;

  const API_BASE = "/api/webchat";
  const MAX_BOT_URL = "https://max.ru/id561901317631_4_bot";
  const EMAIL_ADDR = "designer.85@bk.ru";

  function getClientId() {
    let id = localStorage.getItem("petr_client_id");
    if (!id) {
      id = "web_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("petr_client_id", id);
    }
    return id;
  }

  const clientId = getClientId();
  let currentContext = document.title || "Сайт СпецРазделПД";
  let isOpen = false;
  let isOnline = false;
  let isSending = false;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes petrPulse {
      0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.75); }
      70% { box-shadow: 0 0 0 8px rgba(46, 204, 113, 0); }
      100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
    }
    #petr-launcher {
      position: fixed; right: 20px; bottom: 20px; z-index: 9998;
      display: flex; align-items: center; gap: 10px;
      padding: 13px 18px; border-radius: 50px; border: 1.5px solid #ff9900;
      background: linear-gradient(135deg, #1d1d1d 0%, #101010 100%);
      color: #fff; font-family: Inter, sans-serif; font-weight: 700; font-size: 14px;
      cursor: pointer; box-shadow: 0 12px 30px rgba(0,0,0,0.6), 0 0 18px rgba(255,153,0,0.22);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #petr-launcher:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(255,153,0,0.35); }
    .petr-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #2ecc71;
      display: inline-block; flex-shrink: 0; animation: petrPulse 2s infinite;
    }
    .petr-dot.offline { background: #888; animation: none; }

    #petr-box {
      position: fixed; right: 20px; bottom: 82px; z-index: 9999;
      width: 375px; max-width: calc(100vw - 24px); height: 520px; max-height: calc(100vh - 110px);
      background: #141414; border: 1.5px solid #2e2e2e; border-radius: 18px;
      box-shadow: 0 22px 60px rgba(0,0,0,0.75); display: none; flex-direction: column;
      overflow: hidden; font-family: Inter, sans-serif; color: #fff;
    }
    #petr-box.open { display: flex; }

    .petr-header {
      padding: 13px 15px; background: #1c1c1c; border-bottom: 1px solid #2b2b2b;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .petr-title-wrap { display: flex; flex-direction: column; gap: 2px; }
    .petr-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 7px; }
    .petr-sub { font-size: 11px; color: #b5b5b5; }
    .petr-header-actions { display: flex; align-items: center; gap: 8px; }
    .petr-max-btn {
      font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px;
      background: rgba(255,153,0,0.14); color: #ff9900; border: 1px solid rgba(255,153,0,0.45);
      text-decoration: none; white-space: nowrap;
    }
    .petr-max-btn:hover { background: #ff9900; color: #111; }
    .petr-close {
      background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer; line-height: 1; padding: 2px 6px;
    }
    .petr-close:hover { color: #ff9900; }

    .petr-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      background: #101010;
    }
    .petr-msg {
      max-width: 86%; padding: 10px 13px; border-radius: 13px; font-size: 13.5px; line-height: 1.45;
      white-space: pre-wrap; word-wrap: break-word;
    }
    .petr-msg.bot { align-self: flex-start; background: #1f1f1f; border: 1px solid #2d2d2d; color: #f0f0f0; }
    .petr-msg.user { align-self: flex-end; background: #ff9900; color: #111; font-weight: 500; }
    .petr-msg.typing { color: #a0a0a0; font-style: italic; }

    .petr-input-row {
      padding: 10px; background: #181818; border-top: 1px solid #2a2a2a;
      display: flex; gap: 8px; align-items: center;
    }
    .petr-input {
      flex: 1; padding: 11px 13px; border-radius: 10px; border: 1px solid #333;
      background: #0f0f0f; color: #fff; font-size: 13.5px; outline: none;
    }
    .petr-input:focus { border-color: #ff9900; }
    .petr-send {
      padding: 11px 15px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #ff9900, #e08500); color: #111; font-weight: 800; font-size: 14px;
    }
    .petr-send:disabled { opacity: 0.5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.id = "petr-launcher";
  launcher.type = "button";
  launcher.innerHTML = `<span class="petr-dot offline" id="petrLauncherDot"></span><span id="petrLauncherLabel">Чат с инженером</span>`;

  const box = document.createElement("div");
  box.id = "petr-box";
  box.innerHTML = `
    <div class="petr-header">
      <div class="petr-title-wrap">
        <div class="petr-title"><span class="petr-dot offline" id="petrHeaderDot"></span>Пётр • Консультант</div>
        <div class="petr-sub" id="petrStatusText">Пн–Пт с 9:00 до 20:00</div>
      </div>
      <div class="petr-header-actions">
        <a class="petr-max-btn" href="${MAX_BOT_URL}" target="_blank" rel="noopener">В MAX</a>
        <button class="petr-close" id="petrCloseBtn" type="button" aria-label="Закрыть">&times;</button>
      </div>
    </div>
    <div class="petr-messages" id="petrMessages"></div>
    <form class="petr-input-row" id="petrForm">
      <input class="petr-input" id="petrInput" type="text" maxlength="1000" placeholder="Напишите сообщение..." autocomplete="off">
      <button class="petr-send" id="petrSendBtn" type="submit">→</button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(box);

  const messagesEl = document.getElementById("petrMessages");
  const formEl = document.getElementById("petrForm");
  const inputEl = document.getElementById("petrInput");
  const sendBtn = document.getElementById("petrSendBtn");
  const statusText = document.getElementById("petrStatusText");
  const launcherDot = document.getElementById("petrLauncherDot");
  const launcherLabel = document.getElementById("petrLauncherLabel");
  const headerDot = document.getElementById("petrHeaderDot");

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = "petr-msg " + who;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function setOnlineUi(online) {
    isOnline = online;
    launcherDot.classList.toggle("offline", !online);
    headerDot.classList.toggle("offline", !online);
    launcherLabel.textContent = online
      ? "Чат с инженером • Онлайн"
      : "Чат с инженером • Пн–Пт 9:00–20:00";
    statusText.textContent = online
      ? "Онлайн • Пн–Пт с 9:00 до 20:00"
      : "Не в сети • Пн–Пт с 9:00 до 20:00";
  }

  async function refreshStatus() {
    try {
      const r = await fetch(`${API_BASE}?action=status&t=${Date.now()}`);
      const d = await r.json();
      if (d && d.ok) setOnlineUi(Boolean(d.online));
    } catch (_) {
      setOnlineUi(false);
    }
  }

  async function saveOfflineMessage(text) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    try {
      await fetch(`${API_BASE}?action=lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          email: emailMatch ? emailMatch[0] : "",
          message: text,
          context: currentContext,
        }),
      });
    } catch (_) {}
  }

  async function sendMessage(text) {
    text = String(text || "").trim();
    if (!text || isSending) return;
    isSending = true;
    sendBtn.disabled = true;

    addMessage(text, "user");
    inputEl.value = "";
    const typingEl = addMessage("Пётр печатает...", "bot typing");

    try {
      const sendResp = await fetch(`${API_BASE}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, message: text, context: currentContext }),
      });
      const sendData = await sendResp.json();

      if (!sendData.ok || sendData.status === "offline") {
        typingEl.remove();
        setOnlineUi(false);
        await saveOfflineMessage(text);
        addMessage(
          `Сейчас я временно не в сети (график Пн–Пт с 9:00 до 20:00). Ваше сообщение сохранил — оставьте здесь же email или телефон, и как только подключусь, сразу отвечу. Срочно можно написать на ${EMAIL_ADDR}.`,
          "bot"
        );
        return;
      }

      setOnlineUi(true);
      const jobId = sendData.jobId;
      const deadline = Date.now() + 45000;
      let finalReply = null;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        const chk = await fetch(`${API_BASE}?action=check&jobId=${encodeURIComponent(jobId)}`);
        const chkData = await chk.json();
        if (chkData.status === "done" && chkData.reply) {
          finalReply = chkData.reply;
          break;
        }
        if (chkData.status === "expired") break;
      }

      typingEl.remove();
      if (finalReply) {
        addMessage(finalReply, "bot");
      } else {
        addMessage(`Не успел получить ответ. Попробуйте повторить сообщение или напишите на ${EMAIL_ADDR}.`, "bot");
      }
    } catch (_) {
      typingEl.remove();
      addMessage(`Временная ошибка связи. Можно написать в MAX или на ${EMAIL_ADDR}.`, "bot");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  function openChat(context, prefill) {
    if (context) currentContext = context;
    isOpen = true;
    box.classList.add("open");
    if (!messagesEl.children.length) {
      addMessage("Здравствуйте! Я Пётр. Чем могу помочь? Задавайте любой вопрос.", "bot");
    }
    refreshStatus();
    if (prefill) {
      sendMessage(prefill);
    } else {
      inputEl.focus();
    }
  }

  launcher.addEventListener("click", () => {
    if (isOpen) {
      isOpen = false;
      box.classList.remove("open");
    } else {
      openChat();
    }
  });

  document.getElementById("petrCloseBtn").addEventListener("click", () => {
    isOpen = false;
    box.classList.remove("open");
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(inputEl.value);
  });

  window.openPetrChat = openChat;
  refreshStatus();
  setInterval(refreshStatus, 15000);
})();

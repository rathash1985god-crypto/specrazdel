// petr-widget.js — Чат-виджет нейропродавца Петра для сайта specrazdel56.ru
// Подключение одной строкой перед </body> на любых страницах сайта:
//   <script src="petr-widget.js" defer></script>
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
  let isOnline = true;
  let isSending = false;

  const style = document.createElement("style");
  style.textContent = `
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
    .petr-dot { width: 9px; height: 9px; border-radius: 50%; background: #2ecc71; display: inline-block; }
    .petr-dot.offline { background: #888; }

    #petr-box {
      position: fixed; right: 20px; bottom: 82px; z-index: 9999;
      width: 375px; max-width: calc(100vw - 24px); height: 540px; max-height: calc(100vh - 110px);
      background: #141414; border: 1.5px solid #2e2e2e; border-radius: 18px;
      box-shadow: 0 22px 60px rgba(0,0,0,0.75); display: none; flex-direction: column;
      overflow: hidden; font-family: Inter, sans-serif; color: #fff;
    }
    #petr-box.open { display: flex; }

    .petr-header {
      padding: 13px 15px; background: #1c1c1c; border-bottom: 1px solid #2b2b2b;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .petr-title-wrap { display: flex; flex-direction: column; }
    .petr-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 7px; }
    .petr-sub { font-size: 11px; color: #a0a0a0; }
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

    .petr-quick {
      padding: 8px 12px 4px; display: flex; flex-wrap: wrap; gap: 6px; background: #141414;
      border-top: 1px solid #232323;
    }
    .petr-chip {
      font-size: 11.5px; padding: 5px 9px; border-radius: 999px; cursor: pointer;
      background: #1e1e1e; color: #ddd; border: 1px solid #333;
    }
    .petr-chip:hover { border-color: #ff9900; color: #ff9900; }

    .petr-input-row {
      padding: 10px; background: #181818; border-top: 1px solid #2a2a2a;
      display: flex; gap: 8px; align-items: center;
    }
    .petr-input {
      flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid #333;
      background: #0f0f0f; color: #fff; font-size: 13.5px; outline: none;
    }
    .petr-input:focus { border-color: #ff9900; }
    .petr-send {
      padding: 10px 14px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #ff9900, #e08500); color: #111; font-weight: 800; font-size: 13px;
    }
    .petr-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .petr-offline-form {
      display: none; flex-direction: column; gap: 8px; padding: 12px;
      background: #181818; border-top: 1px solid #2a2a2a;
    }
    .petr-offline-form.active { display: flex; }
    .petr-offline-note { font-size: 12px; color: #ccc; line-height: 1.35; }
  `;
  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.id = "petr-launcher";
  launcher.type = "button";
  launcher.innerHTML = `<span class="petr-dot" id="petrLauncherDot"></span><span>Спросить Петра • расчёт и КП</span>`;

  const box = document.createElement("div");
  box.id = "petr-box";
  box.innerHTML = `
    <div class="petr-header">
      <div class="petr-title-wrap">
        <div class="petr-title"><span class="petr-dot" id="petrHeaderDot"></span>Пётр • ИИ-инженер</div>
        <div class="petr-sub" id="petrStatusText">Онлайн • расчёт цены без НДС и КП</div>
      </div>
      <div class="petr-header-actions">
        <a class="petr-max-btn" href="${MAX_BOT_URL}" target="_blank" rel="noopener">В MAX</a>
        <button class="petr-close" id="petrCloseBtn" type="button" aria-label="Закрыть">&times;</button>
      </div>
    </div>
    <div class="petr-messages" id="petrMessages"></div>
    <div class="petr-quick" id="petrQuick">
      <button type="button" class="petr-chip" data-msg="Нужно рассчитать стоимость и сроки по объекту">Рассчитать цену</button>
      <button type="button" class="petr-chip" data-msg="Работаете без НДС и по ЭДО?">Без НДС и ЭДО</button>
      <button type="button" class="petr-chip" data-msg="Какие исходные данные нужны для старта?">Исходные данные</button>
    </div>
    <form class="petr-input-row" id="petrForm">
      <input class="petr-input" id="petrInput" type="text" maxlength="1000" placeholder="Напишите объект, площадь, разделы..." autocomplete="off">
      <button class="petr-send" id="petrSendBtn" type="submit">→</button>
    </form>
    <form class="petr-offline-form" id="petrOfflineForm">
      <div class="petr-offline-note">Пётр сейчас офлайн. Оставьте email и параметры объекта — направим КП со сроками, ценой без НДС и перечнем исходных данных:</div>
      <input class="petr-input" id="petrOffEmail" type="email" required placeholder="Ваш рабочий email">
      <input class="petr-input" id="petrOffMsg" type="text" required placeholder="Объект, площадь, нужные разделы (ПБ, ГОЧС...)">
      <button class="petr-send" type="submit">Получить КП на почту</button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(box);

  const messagesEl = document.getElementById("petrMessages");
  const formEl = document.getElementById("petrForm");
  const inputEl = document.getElementById("petrInput");
  const sendBtn = document.getElementById("petrSendBtn");
  const quickEl = document.getElementById("petrQuick");
  const offlineForm = document.getElementById("petrOfflineForm");
  const statusText = document.getElementById("petrStatusText");
  const launcherDot = document.getElementById("petrLauncherDot");
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
    statusText.textContent = online
      ? "Онлайн • расчёт цены без НДС и КП"
      : "Офлайн • оставьте email для КП";
    formEl.style.display = online ? "flex" : "none";
    quickEl.style.display = online ? "flex" : "none";
    offlineForm.classList.toggle("active", !online);
  }

  async function refreshStatus() {
    try {
      const r = await fetch(`${API_BASE}?action=status`);
      const d = await r.json();
      if (d && d.ok) setOnlineUi(Boolean(d.online));
    } catch (_) {
      setOnlineUi(false);
    }
  }

  async function sendMessage(text) {
    text = String(text || "").trim();
    if (!text || isSending) return;
    isSending = true;
    sendBtn.disabled = true;

    addMessage(text, "user");
    inputEl.value = "";
    const typingEl = addMessage("Пётр рассчитывает и отвечает...", "bot typing");

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
        addMessage("Пётр сейчас офлайн. Оставьте email в форме ниже — пришлём КП по вашему объекту с перечнем исходных данных.", "bot");
        return;
      }

      const jobId = sendData.jobId;
      const deadline = Date.now() + 38000;
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
        addMessage(`Ответ занял чуть больше обычного. Напишите ваш email — направим КП по объекту, или отправьте ТЗ сразу на ${EMAIL_ADDR}.`, "bot");
      }
    } catch (_) {
      typingEl.remove();
      addMessage(`Временная ошибка связи. Вы можете написать в MAX или отправить ТЗ на ${EMAIL_ADDR}.`, "bot");
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
      addMessage(
        "Здравствуйте! Я Пётр. Напишите, какой у вас объект (площадь, этажность) и какие разделы нужны — сразу посчитаю ориентировочную стоимость без НДС, сроки и помогу с КП или договором по ЭДО.",
        "bot"
      );
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

  quickEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".petr-chip");
    if (btn && btn.dataset.msg) sendMessage(btn.dataset.msg);
  });

  offlineForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("petrOffEmail").value.trim();
    const msg = document.getElementById("petrOffMsg").value.trim();
    if (!email || !msg) return;
    try {
      await fetch(`${API_BASE}?action=lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, email, message: msg, context: currentContext }),
      });
      offlineForm.reset();
      addMessage(`Заявка принята! Как только Пётр выйдет в сеть, подготовим КП по объекту и перечень исходных данных на ${email}.`, "bot");
    } catch (_) {
      addMessage(`Не удалось отправить форму — напишите напрямую на ${EMAIL_ADDR}.`, "bot");
    }
  });

  // Глобальная функция для вызова чата из кнопок и калькулятора на сайте
  window.openPetrChat = openChat;
  refreshStatus();
})();
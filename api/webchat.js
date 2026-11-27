// api/webchat.js — Vercel Serverless Function для чата Петра (без VPS, VPN и туннелей)
// Автоматически поддерживает переменные Upstash/Vercel:
//   KV_REST_API_URL / UPSTASH_REDIS_REST_URL / STORAGE_REST_API_URL
//   KV_REST_API_TOKEN / UPSTASH_REDIS_REST_TOKEN / STORAGE_REST_API_TOKEN
//   WEBCHAT_SECRET

const REDIS_URL = (
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.STORAGE_REST_API_URL ||
  ""
).replace(/\/+$/, "");

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.STORAGE_REST_API_TOKEN ||
  "";

const SECRET = process.env.WEBCHAT_SECRET || "";

const ALLOWED_ORIGINS = [
  "https://www.specrazdel56.ru",
  "https://specrazdel56.ru",
  "http://localhost:3000",
];

async function redisCmd(commandArgs) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Upstash Redis env vars are missing");
  }
  const resp = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commandArgs),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error || `Redis HTTP ${resp.status}`);
  }
  return data.result;
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function isAuthorizedBot(req) {
  if (!SECRET) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${SECRET}`;
}

async function isPetrOnline() {
  const lastSeen = await redisCmd(["GET", "petr:last_seen"]);
  if (!lastSeen) return false;
  return Date.now() - Number(lastSeen) < 25000; // 25 сек (под опрос раз в 10 сек)
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const action = String(req.query.action || "").trim();

  try {
    // 1. Проверка статуса Петра (онлайн ли ПК)
    if (req.method === "GET" && action === "status") {
      const online = await isPetrOnline();
      return res.status(200).json({ ok: true, online });
    }

    // 2. Посетитель отправляет сообщение в очередь
    if (req.method === "POST" && action === "send") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const message = String(body.message || "").trim().slice(0, 1200);
      const clientId = String(body.clientId || "anon").slice(0, 64);
      const context = String(body.context || "Сайт specrazdel56.ru").slice(0, 100);

      if (!message) {
        return res.status(400).json({ ok: false, error: "Empty message" });
      }

      const online = await isPetrOnline();
      if (!online) {
        return res.status(200).json({ ok: true, online: false, status: "offline" });
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const job = { jobId, clientId, message, context, ts: Date.now() };

      await redisCmd(["SET", `petr:res:${jobId}`, JSON.stringify({ status: "pending" }), "EX", 180]);
      await redisCmd(["RPUSH", "petr:queue", JSON.stringify(job)]);

      return res.status(200).json({ ok: true, online: true, jobId });
    }

    // 3. Посетитель проверяет, пришёл ли ответ Петра
    if (req.method === "GET" && action === "check") {
      const jobId = String(req.query.jobId || "").trim();
      if (!jobId) {
        return res.status(400).json({ ok: false, error: "Missing jobId" });
      }
      const raw = await redisCmd(["GET", `petr:res:${jobId}`]);
      if (!raw) {
        return res.status(200).json({ ok: true, status: "expired" });
      }
      const parsed = JSON.parse(raw);
      return res.status(200).json({ ok: true, ...parsed });
    }

    // 4. Офлайн-заявка на КП (когда ПК выключен — сохранится и попадёт в pipeline.db при включении)
    if (req.method === "POST" && action === "lead") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const email = String(body.email || "").trim().slice(0, 120);
      const message = String(body.message || "").trim().slice(0, 1000);
      const clientId = String(body.clientId || "offline").slice(0, 64);
      const context = String(body.context || "Запрос КП (офлайн)").slice(0, 100);

      if (!email && !message) {
        return res.status(400).json({ ok: false, error: "Empty lead" });
      }

      const lead = { clientId, email, message, context, ts: Date.now() };
      await redisCmd(["RPUSH", "petr:offline_leads", JSON.stringify(lead)]);
      return res.status(200).json({ ok: true });
    }

    // 5. ПК Петра (petr_bot.py) забирает очередь и обновляет heartbeat
    if (req.method === "GET" && action === "poll") {
      if (!isAuthorizedBot(req)) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
      await redisCmd(["SET", "petr:last_seen", String(Date.now()), "EX", 60]);

      const jobs = [];
      for (let i = 0; i < 3; i++) {
        const raw = await redisCmd(["LPOP", "petr:queue"]);
        if (!raw) break;
        try { jobs.push(JSON.parse(raw)); } catch (_) {}
      }

      const offlineLeads = [];
      for (let i = 0; i < 10; i++) {
        const raw = await redisCmd(["LPOP", "petr:offline_leads"]);
        if (!raw) break;
        try { offlineLeads.push(JSON.parse(raw)); } catch (_) {}
      }

      return res.status(200).json({ ok: true, jobs, offline_leads: offlineLeads });
    }

    // 6. ПК Петра (petr_bot.py) возвращает готовый ответ
    if (req.method === "POST" && action === "reply") {
      if (!isAuthorizedBot(req)) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const jobId = String(body.jobId || "").trim();
      const reply = String(body.reply || "").trim();
      if (!jobId || !reply) {
        return res.status(400).json({ ok: false, error: "Missing jobId or reply" });
      }
      await redisCmd([
        "SET",
        `petr:res:${jobId}`,
        JSON.stringify({ status: "done", reply, calc: body.calc || null }),
        "EX",
        180,
      ]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Unknown action" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requests = new Map();

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "https://userhunt.onrender.com",
    "Vary": "Origin"
  });
  res.end(JSON.stringify(data));
}

function validUsername(platform, username) {
  const rules = {
    telegram: /^[a-zA-Z0-9_]{5,32}$/,
    instagram: /^[a-zA-Z0-9._]{1,30}$/,
    tiktok: /^[a-zA-Z0-9._]{2,24}$/,
    x: /^[a-zA-Z0-9_]{1,15}$/
  };
  return Boolean(rules[platform] && rules[platform].test(username));
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || now - entry.start >= WINDOW_MS) {
    requests.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

async function checkTelegram(username) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://t.me/" + encodeURIComponent(username), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 USERHUNT/1.0", "Accept": "text/html" }
    });
    const html = await response.text();
    if (response.status === 404) {
      return {
        status: "not_found",
        message: "Публичная страница не найдена. Это не гарантирует, что имя можно зарегистрировать."
      };
    }
    if (response.ok && /tgme_page_(title|extra|photo)/i.test(html)) {
      return {
        status: "occupied",
        message: "Telegram отдаёт публичную страницу этого имени."
      };
    }
    return {
      status: "unknown",
      message: "Telegram не дал однозначного ответа. Попробуй позже или проверь имя в приложении."
    };
  } catch (error) {
    return {
      status: "unknown",
      message: error.name === "AbortError"
        ? "Проверка Telegram превысила лимит времени."
        : "Не удалось связаться с Telegram."
    };
  } finally {
    clearTimeout(timer);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/api/") && req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "https://userhunt.onrender.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    });
    return res.end();
  }

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true, service: "USERHUNT API" });
  }

  if (url.pathname.startsWith("/api/check/")) {
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
    const ip = req.socket.remoteAddress || "unknown";
    if (rateLimited(ip)) return send(res, 429, { error: "Слишком много запросов. Подожди минуту." });

    const parts = url.pathname.split("/").filter(Boolean);
    const platform = parts[2];
    const username = decodeURIComponent(parts[3] || "").replace(/^@/, "");
    if (!validUsername(platform, username)) {
      return send(res, 400, { error: "Неверный формат имени пользователя." });
    }
    if (platform !== "telegram") {
      return send(res, 200, {
        platform,
        username,
        status: "unsupported",
        message: "Серверная проверка этой платформы пока не подключена."
      });
    }
    const result = await checkTelegram(username);
    return send(res, 200, { platform, username, ...result });
  }

  if (url.pathname.startsWith("/api/")) {
    return send(res, 404, { error: "API route not found" });
  }

  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, requested);
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(filePath);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("USERHUNT listening on port " + PORT);
});

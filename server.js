require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
if (!API_KEY) {
  console.warn("تحذير: متغير البيئة GEMINI_API_KEY مش متحدد.");
}

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQ = 8;
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_REQ) {
    return res.status(429).json({ error: "طلبات كتير أوي، حاول تاني بعد شوية." });
  }
  arr.push(now);
  hits.set(ip, arr);
  next();
}

app.post("/api/ai", rateLimit, async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "السيرفر مش متظبط بمفتاح API لسه." });
    const { system, userText, maxTokens } = req.body || {};
    if (!userText) return res.status(400).json({ error: "userText مطلوب." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: String(userText).slice(0, 8000) }] }],
        generationConfig: { maxOutputTokens: Math.min(Math.max(maxTokens || 800, 100), 2000) },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "خطأ من محرك الـAI." });
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
    if (!text) {
      return res.status(502).json({ error: "الموديل رجّع رد فاضي." });
    }
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ داخلي في السيرفر." });
  }
});

const DB_FILE = path.join(__dirname, "data", "leaderboard.json");
function readLeaderboard() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) { return {}; }
}
function writeLeaderboard(obj) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
}

app.get("/api/leaderboard", (req, res) => {
  const db = readLeaderboard();
  const entries = Object.values(db).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  res.json({ entries: entries.slice(0, 50) });
});

app.post("/api/leaderboard", (req, res) => {
  const { username, xp, level, rating, streak } = req.body || {};
  if (!username) return res.status(400).json({ error: "username مطلوب." });
  const db = readLeaderboard();
  db[username] = { username, xp: xp || 0, level: level || 1, rating: rating || 0, streak: streak || 0 };
  writeLeaderboard(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`السيرفر شغال على http://localhost:${PORT}`);
});

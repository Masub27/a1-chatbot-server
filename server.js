import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));

// For testing: allow all. Later you can restrict to your LiaScript domain.
app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM = `
You are a helpful, friendly tutor for an A1 German course.
Reply in English unless the student asks for German.
Explain clearly and give examples.
If the student asks about grammar, give short rules + 2-3 examples.
`;

app.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    // Build a simple text prompt with “ChatGPT-like” behavior
    const historyText = history
      .slice(-12)
      .map(m => `${m.role === "assistant" ? "ASSISTANT" : "USER"}: ${String(m.content || "")}`)
      .join("\n");

    const prompt = `${SYSTEM}\n\n${historyText}\nUSER: ${message}\nASSISTANT:`;

    // generateContent usage follows Gemini API patterns (generateContent / text generation)
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const answer =
      (r?.text && String(r.text)) ||
      (r?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "") ||
      "(no output)";

    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Gemini chatbot running on http://localhost:${PORT}`);
});
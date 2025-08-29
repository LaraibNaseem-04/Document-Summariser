const MODEL = "gemini-2.0-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const KEY = import.meta.env.VITE_GEMINI_API_KEY;

function mustKey() {
  if (!KEY) throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");
}

export async function summariseWithGemini({ text, length = "medium" }) {
  mustKey();
  const target =
    {
      short: "≈80-120 words",
      medium: "≈150-250 words",
      long: "≈300-450 words",
    }[length] || "≈150-250 words";

  const prompt = `
You are a document summariser. Respond ONLY as strict JSON:
{"summary":"...", "key_points":["...","...","..."]}

Rules:
- length: ${target}
- concise & neutral
- keep names, numbers, definitions
- if input empty/garbled: {"summary":"No readable content.", "key_points":[]}

TEXT:
"""${text.slice(0, 180000)}"""
`;

  const res = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const match = raw.match(/\{[\s\S]*\}/);
  try {
    return match ? JSON.parse(match[0]) : { summary: raw, key_points: [] };
  } catch {
    return { summary: raw, key_points: [] };
  }
}

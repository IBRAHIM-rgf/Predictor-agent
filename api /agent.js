import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "missing_env", message: "Missing OPENAI_API_KEY" });

    const body = req.body || {};
    const context = String(body.context || "Agent d’analyse & prédiction (générique)");
    const analysis = body.analysis || {};
    const prediction = body.prediction || {};

    const prompt = `
Tu es un analyste & stratège premium.
Contexte: ${context}

Règles:
- Ne JAMAIS inventer des chiffres.
- Style: chaleureux, confiant, concis, très pro.
- Donne: (1) résumé (2) alertes (3) 3 actions concrètes.

Données (analyse):
${JSON.stringify(analysis, null, 2)}

Données (prédiction):
${JSON.stringify(prediction, null, 2)}
`.trim();

    const out = await client.responses.create({
      model: MODEL,
      reasoning: { effort: "low" },
      input: [{ role: "user", content: prompt }]
    });

    return res.status(200).json({ report: (out.output_text || "").trim() });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err?.message || err) });
  }
}

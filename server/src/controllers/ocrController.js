// AI-powered weight slip OCR using Groq Llama Vision (free tier).
// Sends an image to Groq and parses out structured purchase data.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const PROMPT = `You are an OCR assistant for a scrap-metal trading business in India.
Extract data from this weight slip / receipt image and respond with ONLY a JSON object (no markdown, no commentary) in exactly this shape:

{
  "vendorName": "string or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    { "categoryName": "string", "weight": number_in_kg, "rate": number_per_kg }
  ],
  "notes": "string or null"
}

Rules:
- vendorName: the seller / supplier / party name on the slip (NOT the buyer)
- date: convert any date format to YYYY-MM-DD; null if not visible
- items: one entry per scrap category (e.g., "Iron Scrap", "Copper Wire", "Aluminium")
- weight: numeric kg only — convert tons/quintals to kg (1 ton = 1000 kg, 1 quintal = 100 kg)
- rate: numeric ₹ per kg — if rate is per ton or per quintal, convert to per kg
- notes: any extra info like vehicle number or remarks; null if none
- If a field is unreadable or absent, use null (not empty string)
- Output ONLY the JSON. No backticks. No "Here is..." prefix.`;

export const scanWeightSlip = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: 'OCR not configured — GROQ_API_KEY missing on server',
      });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errText);
      return res
        .status(502)
        .json({ message: `OCR service error (${groqResponse.status})` });
    }

    const data = await groqResponse.json();
    const text = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Groq JSON:', text);
      return res.status(502).json({
        message: 'Could not parse AI response — try a clearer photo',
      });
    }

    // Defensive cleanup
    parsed.items = Array.isArray(parsed.items) ? parsed.items : [];
    parsed.items = parsed.items
      .filter((it) => it && (it.weight || it.rate || it.categoryName))
      .map((it) => ({
        categoryName: it.categoryName || null,
        weight: Number(it.weight) || 0,
        rate: Number(it.rate) || 0,
      }));

    res.json(parsed);
  } catch (error) {
    console.error('OCR error:', error);
    next(error);
  }
};

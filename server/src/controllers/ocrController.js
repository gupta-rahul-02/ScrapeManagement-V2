// AI-powered weight slip OCR using Google Gemini 1.5 Flash Vision (free tier).
// Sends an image to Gemini and parses out structured purchase data.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: 'OCR not configured — GEMINI_API_KEY missing on server',
      });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errText);
      return res
        .status(502)
        .json({ message: `OCR service error (${geminiResponse.status})` });
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      // Strip any stray code fences just in case
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON:', text);
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

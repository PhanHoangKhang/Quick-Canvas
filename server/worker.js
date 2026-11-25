export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/explain") {
      return handleExplain(request, env, jsonResponse);
    }

    if (url.pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        app: "QuickTick",
      });
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};

async function handleExplain(request, env, jsonResponse) {
  try {
    const body = await request.json();
    const { text, question } = body;

    if (!text || typeof text !== "string") {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    if (text.length > 10000) {
      return jsonResponse({ error: "Text is too long" }, 400);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: "Gemini API key is missing" }, 500);
    }

    const prompt = `
You are QuickTick, a learning companion for university students.

Your goal is to help students understand academic concepts clearly.

Guidelines:
- Explain concepts in simple, student-friendly language.
- Break complex ideas into smaller parts.
- Use examples when they help understanding.
- Avoid unnecessarily long explanations.
- Use Markdown formatting when appropriate.
- If the text lacks context, acknowledge it rather than making assumptions.

Selected text:
"""
${text}
"""

Student question:
${question?.trim() || "Explain this concept clearly."}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", data);

      return jsonResponse({ error: "Failed to generate explanation" }, 502);
    }

    const explanation =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "";

    if (!explanation) {
      return jsonResponse({ error: "Gemini returned an empty response" }, 502);
    }

    return jsonResponse({ explanation });
  } catch (error) {
    console.error("Worker error:", error);

    return jsonResponse(
      { error: "Invalid request or internal server error" },
      500,
    );
  }
}

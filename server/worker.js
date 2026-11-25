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
You are QuickTick, a concise academic learning assistant.

Explain the selected concept directly. Do not greet the user, introduce yourself, or add a concluding message.

Rules:
- Start with a direct definition or explanation of the concept.
- Keep the explanation concise, ideally 100-180 words.
- Be simple and easy to understand, but do not oversimplify important details.
- Explain the core mechanism or how it works when relevant.
- Use one short, concrete example only when it genuinely helps.
- Avoid unnecessary introductions, repetition, filler, and unrelated information.
- Use clear Markdown formatting for readability.

Formatting:
- Use short paragraphs, with blank lines between them.
- Use ## headings only when there are distinct sections.
- Use bullet points for 2 or more related items.
- Bold only important terms.
- Avoid excessively nested lists.
- Do not turn every sentence into a bullet point.

Selected text:
${text}

Student's question:
${question?.trim() || "Explain this concept."}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
            temperature: 0.5,
            maxOutputTokens: 800,
          },
        }),
      },
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", data);

      return jsonResponse(
        {
          error: data.error?.message || "Gemini API request failed",
        },
        502,
      );
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

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
    const { text, question, courseContext } = body;

    if (!text || typeof text !== "string") {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const MAX_SELECTED_CHARACTERS = 5000;

    if (text.length > MAX_SELECTED_CHARACTERS) {
      return jsonResponse(
        {
          error: `Selected text exceeds the ${MAX_SELECTED_CHARACTERS} character limit. Please select a smaller portion.`,
        },
        400,
      );
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: "Gemini API key is missing" }, 500);
    }

    const prompt = `
You are QuickTick, a learning companion for university students.

Your goal is to help students understand a selected concept
clearly and efficiently without disrupting their learning flow.

Context:
- Course: ${courseContext?.courseName || "Unknown course"}
- Current page: ${courseContext?.pageTitle || "Unknown page"}
- Document title: ${courseContext?.documentTitle || "Unknown document"}

Use the course and page context to better understand the subject,
the terminology, and the intended learning context.
Treat this context as supplementary information, not as factual evidence.
If the context is irrelevant to the selected text or question,
ignore it and focus on the content itself.

Instructions:
- Explain the concept directly, starting with a clear definition.
- Cover the essential components, principles, steps, or mechanisms
  necessary to genuinely understand the concept.
- Prioritize the most important information instead of explaining
  every detail.
- Explain each key component in 1-2 concise sentences.
- Use simple language while maintaining technical accuracy.
- Include one short practical example when useful.
- Avoid repetition, filler, unnecessary background, and lengthy conclusions.
- Do not turn the explanation into a full tutorial.
- Aim for approximately 100-180 words, but use more when necessary
  to explain complex concepts properly.
- Ensure factual accuracy and use correct terminology.
- Use Markdown for readability.

Formatting:
- Start with a short definition.
- Use bold labels for key concepts.
- Use bullet points when explaining multiple components.
- Keep paragraphs and lists compact.
- Avoid excessive headings and nested lists.

Selected text:
${text}

Student's question:
${question?.trim() || "Explain this concept clearly."}
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

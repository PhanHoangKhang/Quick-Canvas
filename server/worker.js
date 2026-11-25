// npx wrangler secret put GEMINI_API_KEY

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    if (url.pathname === "/api/health" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "QuickTick API",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (request.method === "POST" && url.pathname === "/api/explain") {
      // The Cloudflare binding keeps a separate approximate counter per client
      // IP and data center. This protects the paid Gemini call from bursts.
      const limiter = env.EXPLAIN_RATE_LIMITER;

      if (!limiter) {
        console.error("Rate limiter binding is missing");

        return new Response(
          JSON.stringify({ error: "Rate limiter unavailable" }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

      const { success } = await limiter.limit({
        key: clientIp,
      });

      if (!success) {
        return new Response(
          JSON.stringify({
            error:
              "Quick Canvas needs a short breather. Please try again in about a minute. ✨",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          },
        );
      }

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

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

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
You are Quick Canvas, a learning companion for university students.

Explain the selected concept clearly and efficiently so students
can understand it without disrupting their learning flow.

Context:
- Course: ${courseContext?.courseName || "Unknown course"}
- Page: ${courseContext?.pageTitle || "Unknown page"}
- Document: ${courseContext?.documentTitle || "Unknown document"}

Use context only as supplementary information. If irrelevant,
focus on the selected text and the student's question.

Guidelines:
- Start with a clear, direct definition.
- Explain the essential principles, components or mechanisms.
- Use simple language while maintaining technical accuracy.
- Include a short practical example when useful.
- Avoid filler, repetition and unnecessary background.
- Stay focused; do not turn the explanation into a full tutorial.
- Use compact Markdown with bold labels and bullets when helpful.
- Aim for 100-180 words, extending only when necessary.

Selected text:
${text}

Student's question:
${question?.trim() || "Explain this concept clearly."}
`;

    const geminiResponse = await fetchWithTimeout(
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
      15000,
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", data);

      if (geminiResponse.status === 429 || geminiResponse.status === 503) {
        return jsonResponse(
          {
            error:
              "Quick Canvas is a little busy right now. Please try again in a moment. ✨",
          },
          503,
        );
      }

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

    if (error?.name === "AbortError") {
      return jsonResponse(
        {
          error:
            "Hmm, that took a little longer than expected. Try again in a moment. ✨",
        },
        504,
      );
    }

    return jsonResponse(
      { error: "Invalid request or internal server error" },
      500,
    );
  }
}

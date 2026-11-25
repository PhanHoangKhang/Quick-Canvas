// npx wrangler secret put OPENAI_API_KEY
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

    // Health check
    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({
        status: "ok",
        service: "Quick Canvas API",
        timestamp: new Date().toISOString(),
      });
    }

    // Explain endpoint
    if (url.pathname === "/api/explain" && request.method === "POST") {
      const limiter = env.EXPLAIN_RATE_LIMITER;

      if (!limiter) {
        console.error("Rate limiter binding is missing");

        return jsonResponse(
          {
            error:
              "I'm temporarily unable to help with explanations. Please try again later. ✨",
          },
          503,
        );
      }

      try {
        const clientIp =
          request.headers.get("CF-Connecting-IP") || "unknown";

        const { success } = await limiter.limit({
          key: clientIp,
        });

        if (!success) {
          return jsonResponse(
            {
              error:
                "You're learning a little too fast! Give Quick Canvas a minute, then try again. ✨",
            },
            429,
          );
        }
      } catch (error) {
        console.error("Rate limiter error:", error);

        return jsonResponse(
          {
            error:
              "I'm temporarily unable to help with explanations. Please try again later. ✨",
          },
          503,
        );
      }

      return handleExplain(request, env, jsonResponse);
    }

    return jsonResponse(
      {
        error: "I couldn't find that page. ✨",
      },
      404,
    );
  },
};

// Fetch and read response body within timeout
async function fetchJsonWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const rawBody = await response.text();

    let data = {};

    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw new Error("Invalid JSON response from provider");
    }

    return {
      response,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// OpenAI fallback
async function explainWithOpenAI(prompt, env, jsonResponse) {
  const unavailable = () =>
    jsonResponse(
      {
        error:
          "I'm having a little trouble explaining this right now. Give me a moment and try again. ✨",
      },
      503,
    );

  if (!env.OPENAI_API_KEY) {
    console.error("OpenAI API key is missing");
    return unavailable();
  }

  try {
    const { response, data } = await fetchJsonWithTimeout(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          input: prompt,
          max_output_tokens: 800,
          store: false,
        }),
      },
      15000,
    );

    if (!response.ok) {
      console.error("OpenAI fallback error:", {
        status: response.status,
        error: data.error,
      });

      return unavailable();
    }

    const explanation =
      data.output
        ?.flatMap((item) => item.content || [])
        .filter((content) => content.type === "output_text")
        .map((content) => content.text || "")
        .join("") || "";

    if (!explanation.trim()) {
      console.error("OpenAI fallback returned an empty response");
      return unavailable();
    }

    return jsonResponse({
      explanation,
    });
  } catch (error) {
    console.error("OpenAI fallback request failed:", error);
    return unavailable();
  }
}

// Gemini primary + OpenAI fallback
async function handleExplain(request, env, jsonResponse) {
  let prompt = "";

  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Something didn't quite work. Try selecting the text again and give it another go. ✨",
        },
        400,
      );
    }

    const { text, question, courseContext } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return jsonResponse(
        {
          error:
            "Select some text on Canvas first, and I'll help you understand it. ✨",
        },
        400,
      );
    }

    const MAX_SELECTED_CHARACTERS = 5000;

    if (text.length > MAX_SELECTED_CHARACTERS) {
      return jsonResponse(
        {
          error:
            "That's quite a lot to explain at once! Try selecting a smaller section of text. ✨",
        },
        400,
      );
    }

    if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) {
      console.error("Both AI provider API keys are missing");

      return jsonResponse(
        {
          error:
            "I'm temporarily unable to help with explanations. Please try again later. ✨",
        },
        503,
      );
    }

    prompt = `
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
${typeof question === "string" && question.trim()
  ? question.trim()
  : "Explain this concept clearly."}
`;

    // Use OpenAI directly if Gemini is not configured
    if (!env.GEMINI_API_KEY) {
      console.warn("Gemini key unavailable. Using OpenAI directly.");

      return explainWithOpenAI(prompt, env, jsonResponse);
    }

    try {
      const { response, data } = await fetchJsonWithTimeout(
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

      if (!response.ok) {
        console.error("Gemini API error:", {
          status: response.status,
          error: data.error,
        });

        // Fallback for rate limits and temporary server errors
        if (
          response.status === 429 ||
          response.status >= 500
        ) {
          console.warn("Switching to OpenAI fallback.");

          return explainWithOpenAI(prompt, env, jsonResponse);
        }

        return jsonResponse(
          {
            error:
              "I couldn't process that explanation just now. Please try again. ✨",
          },
          502,
        );
      }

      const explanation =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("") || "";

      if (!explanation.trim()) {
        console.warn("Gemini returned empty output. Switching to OpenAI.");

        return explainWithOpenAI(prompt, env, jsonResponse);
      }

      return jsonResponse({
        explanation,
      });
    } catch (geminiError) {
      console.error("Gemini request failed:", geminiError);

      // Timeout, network error or response parsing error
      console.warn("Switching to OpenAI fallback.");

      return explainWithOpenAI(prompt, env, jsonResponse);
    }
  } catch (error) {
    console.error("Worker error:", error);

    return jsonResponse(
      {
        error:
          "Something didn't quite work. Try selecting the text again and give it another go. ✨",
      },
      500,
    );
  }
}

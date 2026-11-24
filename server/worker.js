// npx wrangler login
// npx wrangler dev

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/explain") {
      return handleExplain(request, env);
    }

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        app: "QuickTick"
      });
    }

    return Response.json(
      { error: "Not Found" },
      { status: 404 }
    );
  }
};

async function handleExplain(request, env) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return Response.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // AI logic will be implemented here

    return Response.json({
      explanation: "AI explanation will be returned here."
    });

  } catch (error) {
    return Response.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
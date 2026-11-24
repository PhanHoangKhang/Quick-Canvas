export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
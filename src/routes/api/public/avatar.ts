import { createFileRoute } from "@tanstack/react-router";

/**
 * Public proxy for Telegram profile photos. The bot token stays server-side:
 * clients only ever see an opaque file_id, and the image bytes are streamed
 * through with long cache headers.
 */
export const Route = createFileRoute("/api/public/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fileId = new URL(request.url).searchParams.get("f") ?? "";
        if (!/^[\w-]{10,200}$/.test(fileId)) return new Response("bad request", { status: 400 });
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("not configured", { status: 503 });

        const meta = (await fetch(`https://api.telegram.org/bot${token}/getFile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: fileId }),
        })
          .then((r) => r.json())
          .catch(() => null)) as { ok?: boolean; result?: { file_path?: string } } | null;

        const path = meta?.result?.file_path;
        if (!meta?.ok || !path || path.includes("..")) {
          return new Response("not found", { status: 404 });
        }

        const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
        if (!upstream.ok || !upstream.body) return new Response("not found", { status: 404 });

        return new Response(upstream.body, {
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      },
    },
  },
});

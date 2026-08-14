import { createFileRoute } from "@tanstack/react-router";

/**
 * Sert les images stockées en base (avatars, barèmes).
 * L'identifiant est un UUID aléatoire non énumérable.
 */
export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const { db } = await import("@/lib/db.server");
        const sql = await db();
        const [row] = await sql<{ content_type: string; data: Uint8Array }[]>`
          select content_type, data from app_files where id = ${id} limit 1
        `;
        if (!row) return new Response("Not found", { status: 404 });

        return new Response(new Uint8Array(row.data), {
          headers: {
            "content-type": row.content_type,
            "cache-control": "private, max-age=3600",
          },
        });
      },
    },
  },
});

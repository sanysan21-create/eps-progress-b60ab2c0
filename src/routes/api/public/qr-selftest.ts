import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/qr-selftest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-selftest-key") !== "temp-selftest-2026") {
          return new Response("Forbidden", { status: 403 });
        }

        const { signStudentToken, hashStudentToken } = await import("@/lib/student-qr.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { studentIds, teacherId } = (await request.json()) as {
          studentIds: string[];
          teacherId: string;
        };
        const out: Record<string, string> = {};
        for (const studentId of studentIds) {
          const id = crypto.randomUUID();
          const token = signStudentToken(id);
          await supabaseAdmin
            .from("student_qr_tokens")
            .insert({ id, student_id: studentId, teacher_id: teacherId, token_hash: hashStudentToken(token) });
          out[studentId] = token;
        }
        return Response.json(out);
      },
    },
  },
});

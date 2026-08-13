import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImageUp, Loader2, ScanLine } from "lucide-react";

import { redeemStudentQr, type RedeemResult } from "@/lib/student-access.functions";

export const Route = createFileRoute("/acces-eleve/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accéder à mon espace élève — EPS Progress" },
      {
        name: "description",
        content:
          "Scanne ton QR code EPS Progress pour accéder à ton espace élève : activités, compétences, objectifs et réussites.",
      },
      { property: "og:title", content: "Accéder à mon espace élève — EPS Progress" },
      {
        property: "og:description",
        content: "Accès simple et sécurisé à l'espace élève EPS Progress par QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAccessPage,
});

const MESSAGES: Record<RedeemResult extends { ok: false; reason: infer R } ? string & R : never, string> =
  {
    invalid: "QR code invalide",
    revoked:
      "Ce QR code n'est plus actif. Demande à ton enseignant de générer un nouveau QR code.",
    unknown: "QR code inconnu",
  };

export function extractToken(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return raw;
  }
}

function StudentAccessPage() {
  const navigate = useNavigate();
  const redeem = useServerFn(redeemStudentQr);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const busyRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function verify(text: string) {
    if (busyRef.current) return;
    const token = extractToken(text);
    if (!token) return;
    busyRef.current = true;
    setChecking(true);
    setError(null);
    scannerRef.current?.stop();
    try {
      const result = await redeem({ data: { token } });
      if (result.ok) {
        void navigate({ to: "/eleve", replace: true });
        return;
      }
      setError(MESSAGES[result.reason]);
    } catch {
      setError("Vérification impossible. Réessaie dans un instant.");
    } finally {
      setChecking(false);
      setScanning(false);
      busyRef.current = false;
    }
  }

  async function startCamera() {
    setError(null);
    setScanning(true);
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (!videoRef.current) return;
      scannerRef.current?.destroy();
      const scanner = new QrScanner(videoRef.current, (result) => void verify(result.data), {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
      });
      scannerRef.current = scanner;
      await scanner.start();
    } catch {
      setScanning(false);
      setError("Impossible d'accéder à la caméra");
    }
  }

  async function scanFile(file: File) {
    setError(null);
    try {
      const { default: QrScanner } = await import("qr-scanner");
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      await verify(result.data);
    } catch {
      setError("QR code invalide");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="display-title block text-4xl italic tracking-tighter text-primary">
            EPS Progress
          </Link>
          <p className="mono-label mt-2 text-muted-foreground">Espace élève</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="display-title text-2xl">Accéder à mon espace élève</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scanne ton QR code pour accéder à ton espace.
          </p>

          <div className="relative mt-5 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
            <video
              ref={videoRef}
              playsInline
              muted
              className={scanning ? "size-full object-cover" : "hidden"}
            />
            {!scanning && (
              <div className="grid size-full place-items-center text-center">
                <div>
                  <ScanLine className="mx-auto size-10 text-primary" />
                  <p className="mono-label mt-3 text-muted-foreground">
                    Place ton QR code dans le cadre
                  </p>
                </div>
              </div>
            )}
            {checking && (
              <div className="absolute inset-0 grid place-items-center bg-background/80">
                <div className="text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                  <p className="mono-label mt-2 text-muted-foreground">Vérification…</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={() => void startCamera()}
            disabled={checking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
          >
            <Camera className="size-4" /> Scanner mon QR code
          </button>

          <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs font-bold uppercase text-foreground">
            <ImageUp className="size-4" /> Utiliser une image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void scanFile(file);
              }}
            />
          </label>

          <Link
            to="/auth"
            className="mono-label mt-6 block text-center text-muted-foreground hover:text-primary"
          >
            Annuler
          </Link>
        </div>
      </div>
    </main>
  );
}

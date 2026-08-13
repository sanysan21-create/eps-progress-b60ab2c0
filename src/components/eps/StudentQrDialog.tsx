import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Printer, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateStudentQr, getStudentQr } from "@/lib/student-qr.functions";

export type QrDialogStudent = {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
};

type Props = {
  student: QrDialogStudent | null;
  className?: string | undefined;
  onOpenChange: (open: boolean) => void;
};

async function buildPrintableCanvas(url: string, title: string, subtitle: string) {
  const qr = await QRCode.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: "M" });
  const image = new Image();
  image.src = qr;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1240;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 50, 60, 900, 900);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "bold 64px Inter, Arial, sans-serif";
  ctx.fillText(title, canvas.width / 2, 1050);
  ctx.font = "40px Inter, Arial, sans-serif";
  ctx.fillStyle = "#555555";
  ctx.fillText(subtitle, canvas.width / 2, 1115);
  ctx.font = "32px Inter, Arial, sans-serif";
  ctx.fillText("EPS Progress · accès espace élève", canvas.width / 2, 1175);
  return canvas;
}

export function StudentQrDialog({ student, className, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const fetchQr = useServerFn(getStudentQr);
  const generate = useServerFn(generateStudentQr);

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const urlRef = useRef<string | null>(null);

  const qrQuery = useQuery({
    queryKey: ["student-qr", student?.id],
    queryFn: () => fetchQr({ data: { studentId: student!.id } }),
    enabled: Boolean(student),
  });

  const token = qrQuery.data?.token ?? null;
  const accessUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/acces-eleve/${token}` : null;
  urlRef.current = accessUrl;

  useEffect(() => {
    if (!accessUrl) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(accessUrl, { width: 640, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [accessUrl]);

  const generateMutation = useMutation({
    mutationFn: () => generate({ data: { studentId: student!.id } }),
    onSuccess: (result) => {
      toast.success(
        result.regeneratedFromEarlier
          ? "Nouveau QR code actif — l'ancien est désormais invalide"
          : "QR code généré",
      );
      queryClient.invalidateQueries({ queryKey: ["student-qr", student?.id] });
      queryClient.invalidateQueries({ queryKey: ["qr-statuses"] });
      setConfirmOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fullName = student ? `${student.first_name} ${student.last_name}` : "";
  const subtitle = `${student?.student_code ?? ""}${className ? ` · ${className}` : ""}`;

  async function download() {
    if (!urlRef.current || !student) return;
    try {
      const canvas = await buildPrintableCanvas(urlRef.current, fullName, subtitle);
      const link = document.createElement("a");
      link.download = `qr-${student.student_code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("Téléchargement impossible");
    }
  }

  async function print() {
    if (!urlRef.current) return;
    try {
      const canvas = await buildPrintableCanvas(urlRef.current, fullName, subtitle);
      const win = window.open("", "_blank", "width=800,height=1000");
      if (!win) {
        toast.error("Autorisez les fenêtres pop-up pour imprimer");
        return;
      }
      win.document.write(
        `<html><head><title>QR ${fullName}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center}img{max-width:100%}</style></head><body><img src="${canvas.toDataURL(
          "image/png",
        )}" onload="window.focus();window.print()"/></body></html>`,
      );
      win.document.close();
    } catch {
      toast.error("Impression impossible");
    }
  }

  return (
    <>
      <Dialog open={Boolean(student)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QR Code de l'élève</DialogTitle>
            <DialogDescription>
              {fullName} — {subtitle || "élève"}
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="mono-label text-muted-foreground">Statut</dt>
              <dd className="mono-label text-primary">
                {qrQuery.isLoading ? "…" : token ? "QR actif" : "QR non généré"}
              </dd>
            </div>
            {qrQuery.data && (
              <div className="flex items-center justify-between gap-4">
                <dt className="mono-label text-muted-foreground">Créé le</dt>
                <dd className="font-bold">
                  {new Date(qrQuery.data.createdAt).toLocaleString("fr-FR")}
                </dd>
              </div>
            )}
          </dl>

          {qrQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : token ? (
            <div className="rounded-2xl border border-border bg-white p-4 text-center">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR code d'accès de ${fullName}`}
                  className="mx-auto aspect-square w-full max-w-[280px]"
                />
              ) : (
                <div className="grid h-[280px] place-items-center">
                  <Loader2 className="size-5 animate-spin text-black" />
                </div>
              )}
              <p className="mt-3 text-sm font-bold text-black">{fullName}</p>
              <p className="font-mono text-[10px] uppercase tracking-tight text-neutral-600">
                {subtitle}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <QrCode className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Cet élève n'a pas encore de QR code d'accès.
              </p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {token ? (
              <>
                <button
                  onClick={() => void download()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase"
                >
                  <Download className="size-4" /> Télécharger
                </button>
                <button
                  onClick={() => void print()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase"
                >
                  <Printer className="size-4" /> Imprimer
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
                >
                  <RefreshCw className="size-4" /> Régénérer
                </button>
              </>
            ) : (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
              >
                <QrCode className="size-4" /> Générer le QR code
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer ce QR code ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'ancien QR code ne permettra plus d'accéder à l'espace élève.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              Régénérer
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

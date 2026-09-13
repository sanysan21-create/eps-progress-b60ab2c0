import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IdCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getStudentQr } from "@/lib/student-qr.functions";
import { getStudentRewards } from "@/lib/rewards.functions";
import { downloadPremiumCardPdf } from "@/lib/student-card";
import { profileTitleLabel } from "@/lib/rewards";

type Props = {
  student: { id: string; first_name: string; last_name: string; student_code?: string };
  className?: string | undefined;
};

/**
 * Récompense Or : génération de la Carte Premium imprimable.
 * Le QR code réutilise l'accès élève existant (aucun second identifiant).
 */
export function PremiumCardButton({ student, className }: Props) {
  const fetchQr = useServerFn(getStudentQr);
  const fetchRewards = useServerFn(getStudentRewards);
  const [busy, setBusy] = useState(false);

  const qr = useQuery({
    queryKey: ["student-qr", student.id],
    queryFn: () => fetchQr({ data: { studentId: student.id } }),
  });
  const rewards = useQuery({
    queryKey: ["student-rewards", student.id],
    queryFn: () => fetchRewards({ data: { studentId: student.id } }),
  });

  async function generate() {
    const token = qr.data?.token;
    if (!token) {
      toast.error("Générez d'abord le QR code de cet élève.");
      return;
    }
    setBusy(true);
    try {
      await downloadPremiumCardPdf(
        {
          firstName: student.first_name,
          lastName: student.last_name,
          className: className ?? "",
          accessUrl: `${window.location.origin}/acces-eleve/${token}`,
          title: profileTitleLabel(rewards.data?.title),
        },
        `carte-premium-${student.student_code ?? student.last_name.toLowerCase()}.pdf`,
      );
      toast.success("Carte Premium générée — imprimer à 100 %, découper puis plastifier.");
    } catch {
      toast.error("Génération de la carte Premium impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void generate()}
      disabled={busy || qr.isLoading}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase disabled:opacity-60"
      style={{
        borderColor: "color-mix(in oklab, var(--color-medal) 60%, transparent)",
        color: "var(--color-medal)",
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <IdCard className="size-4" />}
      Générer la carte Premium
    </button>
  );
}

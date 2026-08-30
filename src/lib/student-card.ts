import QRCode from "qrcode";

/**
 * Génération des cartes élève "EPS PROGRESS" au format carte bancaire (54 × 85,6 mm, portrait).
 * Recto = page 1 (QR code d'accès), verso = page 2 (parcours EPS).
 * Rendu 100 % client (canvas + jsPDF).
 */

export const CARD_W_MM = 54;
export const CARD_H_MM = 85.6;

const PX_PER_MM = 14;
const W = Math.round(CARD_W_MM * PX_PER_MM);
const H = Math.round(CARD_H_MM * PX_PER_MM);

const NAVY = "#062B4C";
const NAVY_DEEP = "#03213D";
const GREEN = "#8BCB16";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F5F6F4";
const LIGHT = "#E9EBEE";

export type StudentCardData = {
  fullName: string;
  className: string;
  accessUrl: string | null;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function font(size: number, weight: "400" | "600" | "700" | "900" = "400") {
  return `${weight} ${size}px Inter, Helvetica, Arial, sans-serif`;
}

function newCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

/** Écrit un texte centré sur plusieurs lignes, sans jamais dépasser la largeur donnée. */
function wrapCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

async function drawFront(data: StudentCardData) {
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Titre
  ctx.textAlign = "center";
  ctx.font = font(60, "900");
  const eps = "EPS ";
  const progress = "PROGRESS";
  const totalW = ctx.measureText(eps).width + ctx.measureText(progress).width;
  let x = W / 2 - totalW / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(eps, x, 96);
  x += ctx.measureText(eps).width;
  ctx.fillStyle = GREEN;
  ctx.fillText(progress, x, 96);

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = font(22, "700");
  ctx.letterSpacing = "4px";
  ctx.fillText("MON ESPACE ÉLÈVE", W / 2, 130);
  ctx.letterSpacing = "0px";

  // Filet vert
  ctx.fillStyle = GREEN;
  ctx.fillRect(40, 152, W - 80, 5);

  // Panneau blanc central
  const panelY = 168;
  const panelH = 700;
  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, 24, panelY, W - 48, panelH, 26);
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.font = font(26, "700");
  wrapCentered(ctx, "Scanne pour accéder à ton espace personnel", W / 2, panelY + 52, W - 130, 34);

  // QR
  const qrSize = 400;
  const qrX = (W - qrSize) / 2;
  const qrY = panelY + 150;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 5;
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 20);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.stroke();

  if (data.accessUrl) {
    const dataUrl = await QRCode.toDataURL(data.accessUrl, {
      width: 800,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: NAVY, light: "#ffffff" },
    });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.fillStyle = "#9AA5B1";
    ctx.font = font(24, "700");
    ctx.textAlign = "center";
    ctx.fillText("QR non généré", W / 2, qrY + qrSize / 2);
  }

  ctx.fillStyle = NAVY;
  ctx.font = font(22, "400");
  wrapCentered(
    ctx,
    "Les informations de progression sont mises à jour régulièrement.",
    W / 2,
    qrY + qrSize + 54,
    W - 130,
    30,
  );

  // Bandeau identité
  const bandY = panelY + panelH + 30;
  ctx.fillStyle = WHITE;
  roundRect(ctx, 34, bandY, W - 68, 96, 22);
  ctx.fill();
  ctx.fillStyle = GREEN;
  roundRect(ctx, 34, bandY, 10, 96, 5);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = font(32, "900");
  ctx.fillText(data.fullName, 72, bandY + 42);
  ctx.fillStyle = "#4A5A6A";
  ctx.font = font(24, "400");
  ctx.fillText(data.className || "Élève", 72, bandY + 76);

  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = font(20, "700");
  ctx.fillText("Ne la prête pas à un autre élève.", W / 2, H - 34);

  return canvas;
}

function icon(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, r: number) {
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (kind === "trend") {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.15);
    ctx.lineTo(cx + r * 0.2, cy + r * 0.25);
    ctx.lineTo(cx + r, cy - r * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.35, cy - r * 0.7);
    ctx.lineTo(cx + r, cy - r * 0.7);
    ctx.lineTo(cx + r, cy - r * 0.1);
    ctx.stroke();
  } else if (kind === "target") {
    for (const k of [1, 0.6]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === "calendar") {
    roundRect(ctx, cx - r, cy - r * 0.85, r * 2, r * 1.8, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 0.25);
    ctx.lineTo(cx + r, cy - r * 0.25);
    ctx.stroke();
    ctx.fillRect(cx - r * 0.55, cy + r * 0.15, r * 0.35, r * 0.35);
    ctx.fillRect(cx + r * 0.2, cy + r * 0.15, r * 0.35, r * 0.35);
  } else if (kind === "bubble") {
    roundRect(ctx, cx - r, cy - r * 0.8, r * 2, r * 1.4, r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.6, cy + r * 1.05);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "lock") {
    roundRect(ctx, cx - r * 0.75, cy - r * 0.15, r * 1.5, r * 1.1, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.2, r * 0.5, Math.PI, 0);
    ctx.stroke();
  }
}

function drawBack(data: StudentCardData) {
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = font(40, "900");
  ctx.fillText("Mon parcours EPS", W / 2, 84);
  ctx.fillStyle = GREEN;
  ctx.fillRect(W / 2 - 70, 104, 140, 5);

  const items: [string, string][] = [
    ["trend", "Mes progrès"],
    ["target", "Mes objectifs"],
    ["star", "Mes réussites"],
    ["calendar", "Mes résultats"],
    ["bubble", "Conseils du professeur"],
  ];

  let y = 176;
  for (const [kind, label] of items) {
    icon(ctx, kind, 68, y - 9, 17);
    ctx.textAlign = "left";
    ctx.font = font(29, "700");
    ctx.fillStyle = WHITE;
    ctx.fillText(label, 108, y);
    ctx.strokeStyle = "rgba(139,203,22,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(108, y + 20);
    ctx.lineTo(W - 52, y + 20);
    ctx.stroke();
    y += 78;
  }

  // Encadré info
  const boxY = y + 30;
  const textLines = [
    "Les informations sur les compétences",
    "sont mises à jour chaque semaine pour",
    "constater ta progression et identifier",
    "tes axes d'amélioration.",
  ];
  const boxH = 56 + textLines.length * 34;
  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, 40, boxY, W - 80, boxH, 22);
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.font = font(23, "400");
  ctx.textAlign = "left";
  textLines.forEach((line, i) => ctx.fillText(line, 68, boxY + 46 + i * 34));

  ctx.fillStyle = GREEN;
  ctx.fillRect(40, H - 150, W - 80, 4);

  icon(ctx, "lock", 70, H - 96, 16);
  ctx.textAlign = "left";
  ctx.fillStyle = LIGHT;
  ctx.font = font(22, "700");
  ctx.fillText("Cette carte est personnelle.", 106, H - 88);
  ctx.fillStyle = "#B9C4CF";
  ctx.font = font(20, "400");
  ctx.fillText(`${data.fullName} · ${data.className || "EPS Progress"}`, 106, H - 56);

  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, H - 10, W, 10);

  return canvas;
}

/** Construit un PDF (recto page 1, verso page 2 pour chaque élève) et le télécharge. */
export async function downloadStudentCardsPdf(cards: StudentCardData[], fileName: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    unit: "mm",
    format: [CARD_W_MM, CARD_H_MM],
    orientation: "portrait",
  });

  let first = true;
  for (const card of cards) {
    const front = await drawFront(card);
    const back = drawBack(card);
    for (const canvas of [front, back]) {
      if (!first) pdf.addPage([CARD_W_MM, CARD_H_MM], "portrait");
      first = false;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
    }
  }

  pdf.save(fileName);
}

/** Aperçu image (data URL) du recto et du verso, pour l'affichage à l'écran. */
export async function renderStudentCardPreview(card: StudentCardData) {
  const front = await drawFront(card);
  const back = drawBack(card);
  return { front: front.toDataURL("image/png"), back: back.toDataURL("image/png") };
}

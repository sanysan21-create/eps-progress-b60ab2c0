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
  const panelH = 640;
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
  const bandY = panelY + panelH + 26;
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
  ctx.fillText("Ne la prête pas à un autre élève.", W / 2, H - 26);

  return canvas;
}

function drawBack(data: StudentCardData) {
  const { canvas, ctx } = newCanvas();

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = font(42, "900");
  ctx.fillText("Mon parcours EPS", W / 2, 92);
  ctx.fillStyle = GREEN;
  ctx.fillRect(W / 2 - 70, 112, 140, 5);

  const items = [
    ["📈", "Mes progrès"],
    ["🎯", "Mes objectifs"],
    ["⭐", "Mes réussites"],
    ["🗓️", "Mes résultats"],
    ["💬", "Conseils de mon professeur"],
  ];

  let y = 190;
  ctx.textAlign = "left";
  for (const [emoji, label] of items) {
    ctx.font = font(34, "400");
    ctx.fillStyle = GREEN;
    ctx.fillText(emoji!, 52, y);
    ctx.font = font(30, "700");
    ctx.fillStyle = WHITE;
    ctx.fillText(label!, 112, y);
    ctx.strokeStyle = "rgba(139,203,22,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(112, y + 20);
    ctx.lineTo(W - 52, y + 20);
    ctx.stroke();
    y += 74;
  }

  // Encadré info
  const boxY = y + 16;
  const boxH = 210;
  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, 40, boxY, W - 80, boxH, 22);
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.font = font(24, "400");
  ctx.textAlign = "left";
  const text =
    "Les informations sur les compétences sont mises à jour chaque semaine pour constater ta progression et identifier tes axes d'amélioration.";
  const words = text.split(" ");
  let line = "";
  let ty = boxY + 48;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > W - 140 && line) {
      ctx.fillText(line, 70, ty);
      ty += 32;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, 70, ty);

  ctx.fillStyle = GREEN;
  ctx.fillRect(40, boxY + boxH + 30, W - 80, 4);

  ctx.fillStyle = LIGHT;
  ctx.font = font(22, "700");
  ctx.textAlign = "center";
  ctx.fillText("🔒 Cette carte est personnelle.", W / 2, boxY + boxH + 78);
  ctx.fillStyle = "#B9C4CF";
  ctx.font = font(20, "400");
  ctx.fillText(data.fullName, W / 2, boxY + boxH + 110);

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

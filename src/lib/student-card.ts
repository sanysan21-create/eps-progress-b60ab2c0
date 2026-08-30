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
const NAVY_SOFT = "#0B3A64";
const GREEN = "#8BCB16";
const GREEN_LIGHT = "#A4D52A";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F5F6F4";
const LIGHT = "#E9EBEE";

const DEFAULT_ACTIVITIES = ["Course", "Escalade", "Danse", "Badminton", "Ultimate"];

export type StudentCardData = {
  fullName: string;
  className: string;
  accessUrl: string | null;
  /** Activités réellement suivies par l'élève (pictogrammes du recto). */
  activities?: string[];
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; br: number; bl: number },
) {
  const rr = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rr.tl, y);
  ctx.lineTo(x + w - rr.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr.tr);
  ctx.lineTo(x + w, y + h - rr.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr.br, y + h);
  ctx.lineTo(x + rr.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr.bl);
  ctx.lineTo(x, y + rr.tl);
  ctx.quadraticCurveTo(x, y, x + rr.tl, y);
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

/** Réduit la taille de police jusqu'à ce que le texte tienne sur une seule ligne. */
function fitOneLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  weight: "700" | "900" = "900",
) {
  let size = start;
  ctx.font = font(size, weight);
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = font(size, weight);
  }
  return size;
}

/* ---------------------------------------------------------------- pictogrammes */

type SportKind = "run" | "climb" | "dance" | "badminton" | "ultimate" | "ball";

function sportKind(name: string): SportKind {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/(cours|running|athle|relais|endurance|demi-fond|sprint)/.test(n)) return "run";
  if (/(escalade|grimpe|bloc)/.test(n)) return "climb";
  if (/(danse|acro|gym|cirque|expression)/.test(n)) return "dance";
  if (/(badminton|tennis|raquette|ping|table)/.test(n)) return "badminton";
  if (/(ultimate|frisbee|disque)/.test(n)) return "ultimate";
  return "ball";
}

function stroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

/** Pictogramme sportif bleu marine avec touche de vert, dans un carré de côté 2r. */
function sportIcon(ctx: CanvasRenderingContext2D, kind: SportKind, cx: number, cy: number, r: number) {
  const u = r / 10;
  stroke(ctx, NAVY, 2.6 * u * 0.9);
  ctx.fillStyle = NAVY;

  if (kind === "run") {
    ctx.beginPath();
    ctx.arc(cx + 1.5 * u, cy - 6 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 3 * u, cy - 1 * u);
    ctx.lineTo(cx + 1 * u, cy - 2.5 * u);
    ctx.lineTo(cx + 4 * u, cy + 1 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 1 * u, cy - 2.5 * u);
    ctx.lineTo(cx - 1 * u, cy + 3 * u);
    ctx.lineTo(cx - 5 * u, cy + 6.5 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 1 * u, cy + 3 * u);
    ctx.lineTo(cx + 4 * u, cy + 6.5 * u);
    ctx.stroke();
    stroke(ctx, GREEN, 2.2 * u * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx - 8 * u, cy - 3 * u);
    ctx.lineTo(cx - 4.5 * u, cy - 3 * u);
    ctx.moveTo(cx - 8 * u, cy + 0.5 * u);
    ctx.lineTo(cx - 5.5 * u, cy + 0.5 * u);
    ctx.stroke();
    return;
  }

  if (kind === "climb") {
    stroke(ctx, GREEN, 2.2 * u * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx - 7 * u, cy - 8 * u);
    ctx.lineTo(cx - 7 * u, cy + 8 * u);
    ctx.stroke();
    ctx.fillStyle = GREEN;
    for (const [dx, dy] of [
      [-3.5, -6],
      [1.5, -2.5],
      [-2, 4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx * u, cy + dy * u, 1.2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    stroke(ctx, NAVY, 2.6 * u * 0.9);
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(cx + 4 * u, cy - 6 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 4 * u, cy - 4 * u);
    ctx.lineTo(cx + 2.5 * u, cy + 1.5 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4 * u, cy - 3 * u);
    ctx.lineTo(cx - 1.5 * u, cy - 5.5 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2.5 * u, cy + 1.5 * u);
    ctx.lineTo(cx - 1 * u, cy + 4.5 * u);
    ctx.moveTo(cx + 2.5 * u, cy + 1.5 * u);
    ctx.lineTo(cx + 4.5 * u, cy + 7 * u);
    ctx.stroke();
    return;
  }

  if (kind === "dance") {
    ctx.beginPath();
    ctx.arc(cx - 0.5 * u, cy - 6.5 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 0.5 * u, cy - 4.5 * u);
    ctx.lineTo(cx + 1 * u, cy + 1 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 0.5 * u, cy - 3.5 * u);
    ctx.lineTo(cx - 5.5 * u, cy - 6 * u);
    ctx.moveTo(cx - 0.5 * u, cy - 3.5 * u);
    ctx.lineTo(cx + 5 * u, cy - 7.5 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 1 * u, cy + 1 * u);
    ctx.lineTo(cx - 3 * u, cy + 7 * u);
    ctx.moveTo(cx + 1 * u, cy + 1 * u);
    ctx.lineTo(cx + 6 * u, cy + 5 * u);
    ctx.stroke();
    stroke(ctx, GREEN, 2.2 * u * 0.9);
    ctx.beginPath();
    ctx.arc(cx + 0.5 * u, cy + 1 * u, 7.5 * u, -0.15 * Math.PI, 0.55 * Math.PI);
    ctx.stroke();
    return;
  }

  if (kind === "badminton") {
    // tamis
    ctx.beginPath();
    ctx.ellipse(cx - 2 * u, cy - 3 * u, 3.6 * u, 4.8 * u, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    // cordage
    stroke(ctx, NAVY, 1.2 * u * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx - 4.6 * u, cy - 4 * u);
    ctx.lineTo(cx + 0.4 * u, cy - 1.4 * u);
    ctx.moveTo(cx - 3.4 * u, cy - 6.4 * u);
    ctx.lineTo(cx - 0.4 * u, cy - 0.4 * u);
    ctx.stroke();
    // manche
    stroke(ctx, NAVY, 2.6 * u * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx + 0.4 * u, cy + 0.6 * u);
    ctx.lineTo(cx + 5.5 * u, cy + 7 * u);
    ctx.stroke();
    // volant vert
    stroke(ctx, GREEN, 2 * u * 0.9);
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(cx + 5 * u, cy - 5 * u, 1.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3.4 * u, cy - 6.6 * u);
    ctx.lineTo(cx + 5 * u, cy - 5 * u);
    ctx.lineTo(cx + 6.6 * u, cy - 6.6 * u);
    ctx.moveTo(cx + 5 * u, cy - 5 * u);
    ctx.lineTo(cx + 5 * u, cy - 7.6 * u);
    ctx.stroke();
    return;
  }


  if (kind === "ultimate") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1 * u, 8 * u, 3.6 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
    stroke(ctx, GREEN, 2.2 * u * 0.9);
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.5 * u, 4.5 * u, 2 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
    stroke(ctx, NAVY, 2.4 * u * 0.9);
    ctx.beginPath();
    ctx.arc(cx, cy + 1 * u, 8 * u, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 7 * u, 0, Math.PI * 2);
  ctx.stroke();
  stroke(ctx, GREEN, 2.2 * u * 0.9);
  ctx.beginPath();
  ctx.moveTo(cx - 7 * u, cy - 1.5 * u);
  ctx.quadraticCurveTo(cx, cy + 3.5 * u, cx + 7 * u, cy - 1.5 * u);
  ctx.stroke();
}

/** Icône utilisateur (cercle + buste). */
function userIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  stroke(ctx, color, r * 0.24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.35, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.75, r * 0.72, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function lockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  stroke(ctx, color, r * 0.22);
  ctx.fillStyle = color;
  roundRect(ctx, cx - r * 0.65, cy - r * 0.1, r * 1.3, r * 0.95, r * 0.22);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r * 0.42, Math.PI, 0);
  ctx.stroke();
}

function infoIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  stroke(ctx, color, r * 0.2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.45, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.1);
  ctx.lineTo(cx, cy + r * 0.5);
  ctx.stroke();
}

/** Pictogrammes du verso (parcours EPS). */
function journeyIcon(
  ctx: CanvasRenderingContext2D,
  kind: "trend" | "target" | "star" | "calendar" | "bubble",
  cx: number,
  cy: number,
  r: number,
) {
  stroke(ctx, GREEN, 3.2);
  ctx.fillStyle = GREEN;
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
  } else {
    roundRect(ctx, cx - r, cy - r * 0.8, r * 2, r * 1.4, r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.6, cy + r * 1.05);
    ctx.closePath();
    ctx.fill();
  }
}

/* ---------------------------------------------------------------------- recto */

async function drawFront(data: StudentCardData) {
  const { canvas, ctx } = newCanvas();
  const R = 40;

  // Fond blanc + silhouette carte
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, R);
  ctx.save();
  ctx.clip();

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  /* En-tête bleu marine */
  const headerH = 196;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, headerH);
  // séparation courbe subtile
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.quadraticCurveTo(W / 2, headerH + 44, W, headerH);
  ctx.lineTo(W, headerH - 4);
  ctx.lineTo(0, headerH - 4);
  ctx.closePath();
  ctx.fillStyle = NAVY;
  ctx.fill();

  ctx.font = font(62, "900");
  const eps = "EPS ";
  const progress = "PROGRESS";
  const totalW = ctx.measureText(eps).width + ctx.measureText(progress).width;
  let x = W / 2 - totalW / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(eps, x, 92);
  x += ctx.measureText(eps).width;
  ctx.fillStyle = GREEN;
  ctx.fillText(progress, x, 92);

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = font(24, "700");
  ctx.letterSpacing = "5px";
  ctx.fillText("MON ESPACE ÉLÈVE", W / 2, 132);
  ctx.letterSpacing = "0px";

  // fine ligne verte de séparation
  ctx.fillStyle = GREEN;
  roundRect(ctx, 54, 160, W - 108, 6, 3);
  ctx.fill();
  ctx.fillStyle = GREEN_LIGHT;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.quadraticCurveTo(W / 2, headerH + 42, W, headerH);
  ctx.lineTo(W, headerH - 3);
  ctx.quadraticCurveTo(W / 2, headerH + 39, 0, headerH - 3);
  ctx.closePath();
  ctx.fill();

  /* Zone centrale blanche */
  ctx.fillStyle = NAVY;
  ctx.font = font(30, "700");
  wrapCentered(ctx, "Scanne pour accéder à ton espace personnel", W / 2, 268, W - 150, 38);

  /* QR code encadré vert */
  const qrSize = 316;
  const qrX = (W - qrSize) / 2;
  const qrY = 356;
  ctx.fillStyle = WHITE;
  stroke(ctx, GREEN, 6);
  roundRect(ctx, qrX - 18, qrY - 18, qrSize + 36, qrSize + 36, 26);
  ctx.fill();
  ctx.stroke();

  if (data.accessUrl) {
    const dataUrl = await QRCode.toDataURL(data.accessUrl, {
      width: 760,
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

  /* Pictogrammes des activités suivies, autour du QR */
  const activities = (data.activities?.length ? data.activities : DEFAULT_ACTIVITIES).slice(0, 6);
  const badgeR = 40;
  const leftX = 74;
  const rightX = W - 74;
  const slotsY = [qrY + 34, qrY + qrSize / 2, qrY + qrSize - 34];
  activities.forEach((name, i) => {
    const side = i % 2 === 0 ? leftX : rightX;
    const slot = slotsY[Math.floor(i / 2)];
    if (slot === undefined) return;
    ctx.fillStyle = OFF_WHITE;
    stroke(ctx, GREEN, 3);
    ctx.beginPath();
    ctx.arc(side, slot, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    sportIcon(ctx, sportKind(name), side, slot, badgeR * 0.62);
  });

  ctx.fillStyle = "#4A5A6A";
  ctx.font = font(22, "400");
  wrapCentered(
    ctx,
    "Les informations de progression sont mises à jour régulièrement.",
    W / 2,
    qrY + qrSize + 74,
    W - 170,
    30,
  );

  /* Bas de carte bleu marine */
  const footY = 900;
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(0, footY + 26);
  ctx.quadraticCurveTo(W / 2, footY - 22, W, footY + 26);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // carte blanche identité
  const bandY = footY + 62;
  const bandH = 116;
  ctx.fillStyle = WHITE;
  roundRect(ctx, 40, bandY, W - 80, bandH, 26);
  ctx.fill();
  ctx.fillStyle = GREEN;
  roundRect(ctx, 40, bandY, 12, bandH, { tl: 6, tr: 0, br: 0, bl: 6 });
  ctx.fill();

  userIcon(ctx, 96, bandY + bandH / 2 - 4, 24, GREEN);

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  const nameSize = fitOneLine(ctx, data.fullName, W - 230, 34, 20, "900");
  ctx.font = font(nameSize, "900");
  ctx.fillText(data.fullName, 138, bandY + 52);
  ctx.fillStyle = "#4A5A6A";
  ctx.font = font(23, "700");
  ctx.fillText(data.className || "Classe", 138, bandY + 88);

  // message de sécurité
  const secY = bandY + bandH + 46;
  ctx.font = font(21, "700");
  const secText = "Ne la prête pas à un autre élève.";
  const secW = ctx.measureText(secText).width;
  const secStart = W / 2 - (secW + 34) / 2;
  lockIcon(ctx, secStart + 11, secY - 7, 15, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(secText, secStart + 34, secY);

  ctx.restore();
  return canvas;
}

/* ---------------------------------------------------------------------- verso */

function drawBack(data: StudentCardData) {
  const { canvas, ctx } = newCanvas();
  const R = 40;

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, R);
  ctx.save();
  ctx.clip();

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  /* Éléments géométriques subtils */
  ctx.fillStyle = NAVY_SOFT;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(W + 30, 150, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-40, H - 260, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(W - 70, H - 90);
  ctx.lineTo(W + 60, H - 220);
  ctx.lineTo(W + 60, H - 40);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  /* En-tête */
  userIcon(ctx, 74, 78, 26, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(38, "900");
  ctx.fillText("Mon parcours EPS", 116, 92);
  ctx.fillStyle = GREEN;
  roundRect(ctx, 74, 118, 150, 6, 3);
  ctx.fill();

  const items: [Parameters<typeof journeyIcon>[1], string][] = [
    ["trend", "Mes progrès"],
    ["target", "Mes objectifs"],
    ["star", "Mes réussites"],
    ["calendar", "Mes résultats"],
    ["bubble", "Conseils de mon professeur"],
  ];

  let y = 220;
  for (const [kind, label] of items) {
    journeyIcon(ctx, kind, 76, y - 10, 17);
    ctx.textAlign = "left";
    ctx.font = font(27, "700");
    ctx.fillStyle = WHITE;
    ctx.fillText(label, 116, y);
    stroke(ctx, "rgba(139,203,22,0.45)", 2);
    ctx.beginPath();
    ctx.moveTo(116, y + 22);
    ctx.lineTo(W - 60, y + 22);
    ctx.stroke();
    y += 102;
  }

  /* Encadré information */
  const textLines = [
    "Les informations sur les compétences",
    "sont mises à jour chaque semaine pour",
    "constater ta progression et identifier",
    "tes axes d'amélioration.",
  ];
  const boxY = y + 26;
  const boxH = 96 + textLines.length * 34;
  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, 44, boxY, W - 88, boxH, 26);
  ctx.fill();

  infoIcon(ctx, 78, boxY + 40, 16, GREEN);
  ctx.fillStyle = NAVY;
  ctx.font = font(20, "700");
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("INFORMATION", 106, boxY + 47);
  ctx.letterSpacing = "0px";

  ctx.font = font(22, "400");
  textLines.forEach((line, i) => ctx.fillText(line, 74, boxY + 92 + i * 34));

  /* Bas de carte */
  ctx.fillStyle = GREEN;
  roundRect(ctx, 44, H - 168, W - 88, 5, 3);
  ctx.fill();

  lockIcon(ctx, 78, H - 116, 17, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(23, "700");
  ctx.fillText("Cette carte est personnelle.", 110, H - 108);
  ctx.fillStyle = LIGHT;
  ctx.font = font(21, "400");
  ctx.fillText("Ne la prête pas à un autre élève.", 110, H - 74);

  ctx.fillStyle = "#8FA3B5";
  ctx.font = font(18, "700");
  ctx.fillText(`${data.fullName} · ${data.className || "EPS Progress"}`, 110, H - 40);

  ctx.restore();
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

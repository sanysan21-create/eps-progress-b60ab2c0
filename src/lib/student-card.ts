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
    // frisbee vu de profil + lignes de vitesse vertes
    stroke(ctx, NAVY, 2.4 * u * 0.9);
    ctx.beginPath();
    ctx.ellipse(cx + 1.5 * u, cy - 1 * u, 6.4 * u, 2.2 * u, -0.08 * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 1.5 * u, cy - 1 * u, 6.4 * u, 0.16 * Math.PI, 0.84 * Math.PI);
    ctx.stroke();
    stroke(ctx, GREEN, 2.2 * u * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx - 8.5 * u, cy + 4 * u);
    ctx.lineTo(cx - 3 * u, cy + 4 * u);
    ctx.moveTo(cx - 6.5 * u, cy + 7 * u);
    ctx.lineTo(cx + 0.5 * u, cy + 7 * u);
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

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, R);
  ctx.save();
  ctx.clip();

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  /* ---------------------------------------------------------- bandeau supérieur */
  const headerH = 208;
  ctx.fillStyle = NAVY_DEEP;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, headerH);
  ctx.quadraticCurveTo(W / 2, headerH + 52, 0, headerH);
  ctx.closePath();
  ctx.fill();

  // Titre imposant : EPS blanc + PROGRESS vert
  const titleSize = fitOneLine(ctx, "EPS PROGRESS", W - 96, 78, 54, "900");
  ctx.font = font(titleSize, "900");
  const eps = "EPS ";
  const progress = "PROGRESS";
  const totalW = ctx.measureText(eps).width + ctx.measureText(progress).width;
  let x = W / 2 - totalW / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(eps, x, 104);
  x += ctx.measureText(eps).width;
  ctx.fillStyle = GREEN;
  ctx.fillText(progress, x, 104);

  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = font(24, "700");
  ctx.letterSpacing = "6px";
  ctx.fillText("MON ESPACE ÉLÈVE", W / 2, 150);
  ctx.letterSpacing = "0px";

  // fine ligne vert citron suivant la courbe du bandeau
  stroke(ctx, GREEN, 6);
  ctx.beginPath();
  ctx.moveTo(0, headerH - 2);
  ctx.quadraticCurveTo(W / 2, headerH + 50, W, headerH - 2);
  ctx.stroke();

  /* --------------------------------------------------------------- zone blanche */
  ctx.fillStyle = NAVY;
  ctx.font = font(31, "700");
  wrapCentered(ctx, "Scanne pour accéder à ton espace personnel", W / 2, 306, W - 190, 40);

  /* ------------------------------------------------------------------- QR code */
  const qrSize = 292; // ≈ 39 % ; cadre vert ≈ 44 % de la largeur
  const pad = 20;
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 384;
  ctx.fillStyle = WHITE;
  stroke(ctx, GREEN, 7);
  roundRect(ctx, qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 28);
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

  /* -------------------------------------------------- pictogrammes des activités */
  const activities = (data.activities?.length ? data.activities : DEFAULT_ACTIVITIES).slice(0, 5);
  const kinds = activities.map(sportKind);
  while (kinds.length < 5) kinds.push(sportKind(DEFAULT_ACTIVITIES[kinds.length] ?? "ball"));

  const sideY = qrY + qrSize / 2;
  const bottomY = qrY + qrSize + 96;
  const slots: Array<[number, number, number]> = [
    [104, sideY, 46], // gauche du QR
    [W - 104, sideY, 46], // droite du QR
    [140, bottomY, 44], // bas gauche
    [W - 140, bottomY, 44], // bas droite
    [W / 2, bottomY, 44], // sous le QR
  ];
  slots.forEach(([cx, cy, r], i) => {
    const kind = kinds[i];
    if (!kind) return;
    sportIcon(ctx, kind, cx, cy, r);
  });

  /* ------------------------------------------------------------- bas du recto */
  const footTop = 852;
  ctx.fillStyle = NAVY_DEEP;
  ctx.beginPath();
  ctx.moveTo(0, footTop);
  ctx.quadraticCurveTo(W / 2, footTop - 54, W, footTop);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // encadré blanc identité
  const bandY = 894;
  const bandH = 148;
  ctx.fillStyle = WHITE;
  roundRect(ctx, 44, bandY, W - 88, bandH, 30);
  ctx.fill();

  userIcon(ctx, 108, bandY + 56, 28, GREEN);

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  const nameSize = fitOneLine(ctx, data.fullName, W - 240, 38, 18, "900");
  ctx.font = font(nameSize, "900");
  ctx.fillText(data.fullName, 158, bandY + 66);
  ctx.fillStyle = NAVY_SOFT;
  ctx.font = font(26, "700");
  ctx.fillText(data.className || "Classe", 158, bandY + 112);

  // message de sécurité
  const secY = bandY + bandH + 54;
  ctx.font = font(22, "700");
  const secText = "Ne la prête pas à un autre élève.";
  const secW = ctx.measureText(secText).width;
  const secStart = W / 2 - (secW + 38) / 2;
  lockIcon(ctx, secStart + 12, secY - 8, 16, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(secText, secStart + 38, secY);

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

  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, 0, W, H);

  /* chevrons diagonaux ton sur ton, sur toute la hauteur */
  ctx.save();
  ctx.globalAlpha = 0.32;
  stroke(ctx, NAVY_SOFT, 20);
  for (let row = -1; row < 8; row++) {
    const baseY = row * 190;
    for (let col = -1; col < 4; col++) {
      const baseX = col * 300 + (row % 2 === 0 ? 0 : 150);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY + 120);
      ctx.lineTo(baseX + 150, baseY);
      ctx.lineTo(baseX + 300, baseY + 120);
      ctx.stroke();
    }
  }
  ctx.restore();


  /* en-tête */
  userIcon(ctx, 82, 92, 28, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(40, "900");
  ctx.fillText("Mon parcours EPS", 130, 108);

  const items: [Parameters<typeof journeyIcon>[1], string][] = [
    ["trend", "Mes progrès"],
    ["target", "Mes objectifs"],
    ["star", "Mes réussites"],
    ["calendar", "Mes résultats"],
    ["bubble", "Conseils de mon professeur"],
  ];

  let y = 216;
  for (const [kind, label] of items) {
    journeyIcon(ctx, kind, 84, y - 9, 21);
    ctx.textAlign = "left";
    ctx.font = font(label.length > 20 ? 26 : 29, "700");
    ctx.fillStyle = WHITE;
    ctx.fillText(label, 132, y);
    stroke(ctx, "rgba(139,203,22,0.55)", 2.5);
    ctx.beginPath();
    ctx.moveTo(56, y + 30);
    ctx.lineTo(W - 56, y + 30);
    ctx.stroke();
    y += 92;
  }

  /* encadré information */
  const textLines = [
    "Les informations sur les compétences",
    "sont mises à jour chaque semaine pour",
    "constater ta progression et identifier",
    "tes axes d'amélioration.",
  ];
  const lineH = 34;
  const boxH = 74 + textLines.length * lineH;
  const boxY = y + 22;

  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, 48, boxY, W - 96, boxH, 28);
  ctx.fill();

  infoIcon(ctx, 84, boxY + 42, 17, GREEN);
  ctx.fillStyle = NAVY;
  ctx.font = font(21, "900");
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("INFORMATION", 114, boxY + 50);
  ctx.letterSpacing = "0px";

  ctx.font = font(23, "400");
  ctx.fillStyle = NAVY;
  textLines.forEach((line, i) => ctx.fillText(line, 76, boxY + 96 + i * lineH));

  /* bas du verso */
  const lineY = boxY + boxH + 40;
  ctx.fillStyle = GREEN;
  roundRect(ctx, 48, lineY, W - 96, 5, 3);
  ctx.fill();

  lockIcon(ctx, 84, lineY + 52, 18, GREEN);
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(24, "700");
  ctx.fillText("Cette carte est personnelle.", 120, lineY + 46);
  ctx.fillStyle = LIGHT;
  ctx.font = font(22, "400");
  ctx.fillText("Ne la prête pas à un autre élève.", 120, lineY + 80);

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

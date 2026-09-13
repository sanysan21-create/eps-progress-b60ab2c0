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
  ctx.letterSpacing = "0px";
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
  const boxX = 48;
  const boxW = W - 96;
  const textX = boxX + 28;
  const textMaxW = boxW - 56;
  const lineH = 34;

  ctx.font = font(23, "400");
  ctx.letterSpacing = "0px";
  const words =
    "Les informations sur les compétences sont mises à jour chaque semaine pour constater ta progression et identifier tes axes d'amélioration.".split(
      " ",
    );
  const textLines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > textMaxW && current) {
      textLines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) textLines.push(current);

  const boxH = 74 + textLines.length * lineH;
  const boxY = y + 22;

  ctx.fillStyle = OFF_WHITE;
  roundRect(ctx, boxX, boxY, boxW, boxH, 28);
  ctx.fill();

  infoIcon(ctx, textX + 8, boxY + 42, 17, GREEN);
  ctx.fillStyle = NAVY;
  ctx.font = font(21, "900");
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("INFORMATION", textX + 38, boxY + 50);
  ctx.letterSpacing = "0px";

  ctx.font = font(23, "400");
  ctx.fillStyle = NAVY;
  textLines.forEach((line, i) => ctx.fillText(line, textX, boxY + 96 + i * lineH));


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


/**
 * Construit un PDF A4 : plusieurs cartes (format carte bancaire) disposées en grille
 * avec espacement. Les rectos d'un lot occupent une page, les versos la page suivante —
 * jamais recto et verso d'une même carte sur la même page.
 */
export async function downloadStudentCardsPdf(cards: StudentCardData[], fileName: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const GAP = 6;
  const COLS = Math.max(1, Math.floor((PAGE_W - 2 * 8 + GAP) / (CARD_W_MM + GAP)));
  const ROWS = Math.max(1, Math.floor((PAGE_H - 2 * 8 + GAP) / (CARD_H_MM + GAP)));
  const PER_PAGE = COLS * ROWS;
  const offsetX = (PAGE_W - (COLS * CARD_W_MM + (COLS - 1) * GAP)) / 2;
  const offsetY = (PAGE_H - (ROWS * CARD_H_MM + (ROWS - 1) * GAP)) / 2;

  const placeGrid = (images: string[], firstPage: boolean) => {
    if (!firstPage) pdf.addPage("a4", "portrait");
    images.forEach((dataUrl, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = offsetX + col * (CARD_W_MM + GAP);
      const y = offsetY + row * (CARD_H_MM + GAP);
      pdf.addImage(dataUrl, "PNG", x, y, CARD_W_MM, CARD_H_MM);
      pdf.setDrawColor(190, 195, 200);
      pdf.setLineWidth(0.1);
      pdf.rect(x, y, CARD_W_MM, CARD_H_MM);
    });
  };

  let firstPage = true;
  for (let start = 0; start < cards.length; start += PER_PAGE) {
    const batch = cards.slice(start, start + PER_PAGE);
    const fronts: string[] = [];
    const backs: string[] = [];
    for (const card of batch) {
      fronts.push((await drawFront(card)).toDataURL("image/png"));
      backs.push(drawBack(card).toDataURL("image/png"));
    }
    placeGrid(fronts, firstPage);
    firstPage = false;
    placeGrid(backs, false);
  }

  pdf.save(fileName);
}


/** Aperçu image (data URL) du recto et du verso, pour l'affichage à l'écran. */
export async function renderStudentCardPreview(card: StudentCardData) {
  const front = await drawFront(card);
  const back = drawBack(card);
  return { front: front.toDataURL("image/png"), back: back.toDataURL("image/png") };
}

/* ------------------------------------------------------------------------- */
/* Carte PREMIUM OR — récompense de la médaille Or.                          */
/* Même format (carte bancaire) et mêmes outils de dessin que la carte        */
/* standard : seule l'identité visuelle change (noir / or).                   */
/* ------------------------------------------------------------------------- */

const INK = "#08090C";
const INK_2 = "#141821";
const GOLD = "#D4A017";
const GOLD_LIGHT = "#F2D888";

export type PremiumCardData = {
  firstName: string;
  lastName: string;
  className: string;
  accessUrl: string | null;
  /** Titre de profil choisi par l'élève (facultatif). */
  title?: string | null;
};

/** Étoile pleine (pictogramme "Or"), sans emoji pour un rendu net à l'impression. */
function starShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
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
}

/** Fond commun : noir profond + chevrons dorés très discrets. */
function premiumBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = INK_2;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.34);
  ctx.lineTo(W, H * 0.2);
  ctx.lineTo(W, H * 0.78);
  ctx.lineTo(0, H * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  stroke(ctx, GOLD, 12);
  for (let row = -1; row < 9; row++) {
    const baseY = row * 170;
    for (let col = -1; col < 4; col++) {
      const baseX = col * 300 + (row % 2 === 0 ? 0 : 150);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY + 110);
      ctx.lineTo(baseX + 150, baseY);
      ctx.lineTo(baseX + 300, baseY + 110);
      ctx.stroke();
    }
  }
  ctx.restore();

  // liseré doré intérieur
  stroke(ctx, GOLD, 8);
  roundRect(ctx, 18, 18, W - 36, H - 36, 30);
  ctx.stroke();
}

function drawPremiumFront(data: PremiumCardData) {
  const { canvas, ctx } = newCanvas();
  roundRect(ctx, 0, 0, W, H, 40);
  ctx.save();
  ctx.clip();
  premiumBackground(ctx);

  /* en-tête : EPS PROGRESS */
  const titleSize = fitOneLine(ctx, "EPS PROGRESS", W - 130, 62, 40, "900");
  ctx.font = font(titleSize, "900");
  const eps = "EPS ";
  const rest = "PROGRESS";
  const totalW = ctx.measureText(eps).width + ctx.measureText(rest).width;
  let x = W / 2 - totalW / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(eps, x, 92);
  x += ctx.measureText(eps).width;
  ctx.fillStyle = GREEN;
  ctx.fillText(rest, x, 92);

  /* bandeau CARTE PREMIUM */
  const bandY = 118;
  ctx.fillStyle = GOLD;
  roundRect(ctx, 64, bandY, W - 128, 62, 20);
  ctx.fill();
  starShape(ctx, 104, bandY + 31, 17, INK);
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = font(28, "900");
  ctx.letterSpacing = "4px";
  ctx.fillText("CARTE PREMIUM", W / 2 + 14, bandY + 41);
  ctx.letterSpacing = "0px";

  /* médaille Or (disque doré + étoile) */
  const medalCy = 330;
  const grad = ctx.createLinearGradient(W / 2 - 90, medalCy - 90, W / 2 + 90, medalCy + 90);
  grad.addColorStop(0, GOLD_LIGHT);
  grad.addColorStop(1, GOLD);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(W / 2, medalCy, 88, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, GOLD_LIGHT, 5);
  ctx.beginPath();
  ctx.arc(W / 2, medalCy, 100, 0, Math.PI * 2);
  ctx.stroke();
  starShape(ctx, W / 2, medalCy - 4, 46, INK);
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = font(24, "900");
  ctx.letterSpacing = "6px";
  ctx.fillText("MÉDAILLE OR", W / 2, medalCy + 154);
  ctx.letterSpacing = "0px";

  /* identité */
  const firstSize = fitOneLine(ctx, data.firstName.toUpperCase(), W - 130, 62, 30, "900");
  ctx.font = font(firstSize, "900");
  ctx.fillStyle = WHITE;
  ctx.fillText(data.firstName.toUpperCase(), W / 2, 596);

  const lastSize = fitOneLine(ctx, data.lastName.toUpperCase(), W - 130, 52, 24, "900");
  ctx.font = font(lastSize, "900");
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillText(data.lastName.toUpperCase(), W / 2, 596 + lastSize + 14);

  ctx.font = font(30, "700");
  ctx.fillStyle = WHITE;
  ctx.letterSpacing = "3px";
  ctx.fillText(data.className || "Classe", W / 2, 720);
  ctx.letterSpacing = "0px";

  if (data.title) {
    ctx.font = font(26, "700");
    ctx.fillStyle = GREEN_LIGHT;
    ctx.fillText(data.title, W / 2, 766);
  }

  /* pied : ÉLÈVE OR */
  const footY = H - 132;
  ctx.fillStyle = GOLD;
  roundRect(ctx, 64, footY, W - 128, 6, 3);
  ctx.fill();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = font(30, "900");
  ctx.letterSpacing = "8px";
  ctx.fillText("ÉLÈVE OR", W / 2, footY + 62);
  ctx.letterSpacing = "0px";

  ctx.restore();
  return canvas;
}

async function drawPremiumBack(data: PremiumCardData) {
  const { canvas, ctx } = newCanvas();
  roundRect(ctx, 0, 0, W, H, 40);
  ctx.save();
  ctx.clip();
  premiumBackground(ctx);

  const titleSize = fitOneLine(ctx, "EPS PROGRESS", W - 130, 56, 36, "900");
  ctx.font = font(titleSize, "900");
  const eps = "EPS ";
  const rest = "PROGRESS";
  const totalW = ctx.measureText(eps).width + ctx.measureText(rest).width;
  let x = W / 2 - totalW / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.fillText(eps, x, 92);
  x += ctx.measureText(eps).width;
  ctx.fillStyle = GREEN;
  ctx.fillText(rest, x, 92);

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = font(24, "900");
  ctx.letterSpacing = "5px";
  ctx.fillText("CARTE PREMIUM", W / 2, 136);
  ctx.letterSpacing = "0px";

  /* QR code : volontairement grand pour rester lisible après plastification */
  const qrSize = 470;
  const pad = 26;
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 210;
  ctx.fillStyle = WHITE;
  stroke(ctx, GOLD, 8);
  roundRect(ctx, qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 26);
  ctx.fill();
  ctx.stroke();

  if (data.accessUrl) {
    const dataUrl = await QRCode.toDataURL(data.accessUrl, {
      width: 900,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.fillStyle = "#9AA5B1";
    ctx.font = font(24, "700");
    ctx.fillText("QR non généré", W / 2, qrY + qrSize / 2);
  }

  ctx.fillStyle = WHITE;
  ctx.font = font(29, "700");
  wrapCentered(
    ctx,
    "Scanne pour accéder à ton espace EPS Progress",
    W / 2,
    qrY + qrSize + 86,
    W - 150,
    38,
  );

  ctx.fillStyle = GOLD;
  roundRect(ctx, 64, H - 152, W - 128, 5, 3);
  ctx.fill();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = font(24, "700");
  ctx.fillText("Cette carte est personnelle.", W / 2, H - 100);
  ctx.fillStyle = LIGHT;
  ctx.font = font(22, "400");
  ctx.fillText(`${data.firstName} ${data.lastName} · ${data.className || "Classe"}`, W / 2, H - 64);

  ctx.restore();
  return canvas;
}

/**
 * PDF imprimable de la carte Premium : recto et verso côte à côte sur une page A4,
 * au format carte bancaire, avec un trait de découpe fin et des marges confortables.
 */
export async function downloadPremiumCardPdf(card: PremiumCardData, fileName: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const front = drawPremiumFront(card).toDataURL("image/png");
  const back = (await drawPremiumBack(card)).toDataURL("image/png");

  const GAP = 12;
  const totalW = CARD_W_MM * 2 + GAP;
  const x0 = (210 - totalW) / 2;
  const y0 = 40;

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(11);
  pdf.text("EPS Progress — Carte Premium Or", x0, 24);
  pdf.setFontSize(9);
  pdf.text(
    `${card.firstName} ${card.lastName}${card.className ? ` · ${card.className}` : ""}`,
    x0,
    30,
  );

  [front, back].forEach((image, index) => {
    const x = x0 + index * (CARD_W_MM + GAP);
    pdf.addImage(image, "PNG", x, y0, CARD_W_MM, CARD_H_MM);
    pdf.setDrawColor(170, 170, 170);
    pdf.setLineWidth(0.1);
    pdf.rect(x, y0, CARD_W_MM, CARD_H_MM);
  });

  pdf.setFontSize(8);
  pdf.text("Recto", x0, y0 + CARD_H_MM + 6);
  pdf.text("Verso", x0 + CARD_W_MM + GAP, y0 + CARD_H_MM + 6);
  pdf.text(
    "Imprimer à 100 % (sans mise à l'échelle), découper sur les traits puis plastifier.",
    x0,
    y0 + CARD_H_MM + 14,
  );

  pdf.save(fileName);
}

/** Aperçu écran (data URLs) du recto et du verso de la carte Premium. */
export async function renderPremiumCardPreview(card: PremiumCardData) {
  const front = drawPremiumFront(card);
  const back = await drawPremiumBack(card);
  return { front: front.toDataURL("image/png"), back: back.toDataURL("image/png") };
}

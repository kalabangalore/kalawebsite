// Shared certificate rendering logic, mirrored from server/certificate.js.
// The canvas is always drawn at the template's native resolution
// (2210x1493) — the <canvas> element itself can be scaled down with CSS.

export const CANVAS_W = 2210;
export const CANVAS_H = 1493;

export const TYPE_LABEL = {
  life: "Life",
  institutional: "Institutional",
  student: "Student",
};

export const DEFAULT_LAYOUT = {
  membershipNo: { x: 0.655, y: 0.185, fontSize: 34, color: "#1a2a52", align: "left", weight: 700 },
  name: { x: 0.5, y: 0.585, fontSize: 64, color: "#1a2a52", align: "center", weight: 700 },
  body: { x: 0.5, y: 0.6, width: 0.78, height: 0.18, fontSize: 40, color: "#1a2a52", align: "center", lineHeight: 1.45 },
};

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}

export function buildBodyText({ membership_type, verified_date }) {
  const typeLabel = TYPE_LABEL[membership_type] || "Life";
  const date = formatDate(verified_date) || formatDate(new Date());
  return (
    `who is a ${typeLabel} Member of  Karnataka State Library Association ®(KALA) verified as ` +
    `on ${date}. The Association has granted the member all the rights and privileges outlined in the bylaws of KALA.`
  );
}

// Greedy word-wrap for a canvas 2D context.
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the certificate onto a canvas element.
// data: { name, membership_type, membership_no, verified_date }
export function drawCertificate(canvas, { templateImg, layout, data }) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  const L = { ...DEFAULT_LAYOUT, ...layout };

  // Membership number
  const no = L.membershipNo;
  ctx.font = `${no.weight || 700} ${no.fontSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = no.color;
  ctx.textAlign = no.align;
  ctx.textBaseline = "middle";
  ctx.fillText(data.membership_no || "—", no.x * CANVAS_W, no.y * CANVAS_H);

  // Name
  const n = L.name;
  ctx.font = `${n.weight || 700} ${n.fontSize}px "Fraunces", Georgia, serif`;
  ctx.fillStyle = n.color;
  ctx.textAlign = n.align;
  ctx.textBaseline = "middle";
  ctx.fillText(data.name || "", n.x * CANVAS_W, n.y * CANVAS_H);

  // Body paragraph — mask the whole box over the template's baked-in text
  // (a fixed box, not sized to the new text, so it reliably covers the
  // original regardless of how the redrawn text wraps), then redraw fresh,
  // vertically centered inside that box.
  const b = L.body;
  const boxW = b.width * CANVAS_W;
  const boxH = (b.height ?? 0.2) * CANVAS_H;
  const boxTop = b.y * CANVAS_H;
  const boxLeft = b.x * CANVAS_W - boxW / 2;
  const lineHeight = b.fontSize * (b.lineHeight || 1.45);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxLeft, boxTop, boxW, boxH);

  const text = buildBodyText(data);
  ctx.font = `${b.fontSize}px Inter, Arial, sans-serif`;
  const lines = wrapLines(ctx, text, boxW);
  const textH = lines.length * lineHeight;
  const firstLineY = boxTop + (boxH - textH) / 2 + lineHeight / 2;

  ctx.fillStyle = b.color;
  ctx.textAlign = b.align;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.fillText(line, b.x * CANVAS_W, firstLineY + i * lineHeight);
  });
}

const imageCache = new Map();

// Cached so re-renders (e.g. every keystroke in a live preview) don't
// re-fetch/re-decode the same template image.
export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

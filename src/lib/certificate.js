// Shared certificate rendering logic, mirrored from server/certificate.js.
// The canvas is always drawn at the template's native resolution
// (2210x1493) — the <canvas> element itself can be scaled down with CSS.

export const CANVAS_W = 2210;
export const CANVAS_H = 1493;

export const DEFAULT_LAYOUT = {
  membershipNo: { x: 0.655, y: 0.20, fontSize: 28, color: "#1a2a52", align: "left", weight: 700 },
  name: { x: 0.5, y: 0.585, fontSize: 64, color: "#1a2a52", align: "center", weight: 700 },
};

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

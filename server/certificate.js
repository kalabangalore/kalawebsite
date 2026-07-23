import crypto from "crypto";

// Default placeholder layout for the certificate template (2210x1493 canvas).
// x/y are fractions of the canvas width/height.
export const DEFAULT_LAYOUT = {
  membershipNo: { x: 0.655, y: 0.20, fontSize: 28, color: "#1a2a52", align: "left", weight: 700 },
  name: { x: 0.5, y: 0.585, fontSize: 64, color: "#1a2a52", align: "center", weight: 700 },
};

export function genCertRef() {
  return "KALA-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function genMembershipNo(member) {
  const initial = (member.membership_type || "life")[0].toUpperCase();
  const year = new Date().getFullYear();
  const padded = String(member.id).padStart(6, "0");
  return `KALA-${initial}-${year}-${padded}`;
}

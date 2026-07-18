import crypto from "crypto";

// Sentence wording per membership type, plugged into the certificate paragraph.
export const TYPE_LABEL = {
  life: "Life",
  institutional: "Institutional",
  student: "Student",
};

// Default placeholder layout for the certificate template (2210x1493 canvas).
// x/y are fractions of the canvas width/height; "body" additionally wraps
// within a box of the given width, top-anchored at y.
export const DEFAULT_LAYOUT = {
  membershipNo: { x: 0.655, y: 0.185, fontSize: 34, color: "#1a2a52", align: "left", weight: 700 },
  name: { x: 0.5, y: 0.585, fontSize: 64, color: "#1a2a52", align: "center", weight: 700 },
  body: { x: 0.5, y: 0.6, width: 0.78, height: 0.18, fontSize: 40, color: "#1a2a52", align: "center", lineHeight: 1.45 },
};

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}

// Builds the certificate's main paragraph for a given member record.
export function buildBodyText(member) {
  const typeLabel = TYPE_LABEL[member.membership_type] || "Life";
  const date = formatDate(member.verified_date) || formatDate(new Date());
  return (
    `who is a ${typeLabel} Member of  Karnataka State Library Association ®(KALA) verified as ` +
    `on ${date}. The Association has granted the member all the rights and privileges outlined in the bylaws of KALA.`
  );
}

export function genCertRef() {
  return "KALA-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function genMembershipNo(member) {
  const initial = (member.membership_type || "life")[0].toUpperCase();
  const year = new Date().getFullYear();
  const padded = String(member.id).padStart(6, "0");
  return `KALA-${initial}-${year}-${padded}`;
}

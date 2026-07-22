import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { q, initSchema, WRITABLE, ADMIN_WRITABLE } from "./db.js";
import { DEFAULT_LAYOUT, genCertRef, genMembershipNo } from "./certificate.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = express();
app.use(cors());
// Payment receipts arrive base64-encoded in the JSON body (~1.37x their
// raw size), so the default 1mb limit isn't enough for a ~1MB upload.
app.use(express.json({ limit: "3mb" }));

// Ensure the schema exists. Cached so it runs once per warm instance
// (works for both the local server and Vercel serverless cold starts).
let ready = null;
app.use(async (_req, res, next) => {
  try {
    if (!ready) ready = initSchema();
    await ready;
    next();
  } catch (err) {
    ready = null;
    console.error("DB init failed:", err.message);
    res.status(500).json({ error: "Database unavailable" });
  }
});

// ---- helpers -------------------------------------------------------------

// Build a parameterised column list from a body, restricted to allowed keys.
function pick(body, allowed) {
  const cols = [];
  const vals = [];
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    let v = body[key];
    if (key === "experience") v = JSON.stringify(Array.isArray(v) ? v : []);
    if (key === "amount_paid") v = v === "" || v === null ? null : Number(v);
    cols.push(key);
    vals.push(v);
  }
  return { cols, vals };
}

const rowToMember = (r) => r; // experience comes back as parsed JSON from pg

// Emails a base64 payment receipt (as an attachment) via Gmail SMTP, using
// an App Password rather than OAuth. We never persist the file anywhere
// ourselves — it just lives in the destination inbox — so Postgres storage
// doesn't grow with uploads.
let mailer = null;
function getMailer() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!mailer) {
    mailer = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return mailer;
}

// Sends ONE email covering both audiences — addressed to the applicant
// (thank-you + their records) and cc'd to the office (for the receipt +
// their own tracking) — rather than two separate sends. Each Gmail SMTP
// round trip takes several seconds, and this whole step has to finish
// inside a single serverless request/response cycle, so one send instead
// of two meaningfully cuts the risk of hitting a platform timeout.
async function emailNotification(receipt, certificatePreview, meta) {
  const transport = getMailer();
  if (!transport) {
    console.warn("GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping notification email");
    return false;
  }

  const officeAddr = process.env.RECEIPT_EMAIL_TO || process.env.GMAIL_USER;
  const to = meta.email || officeAddr;
  const cc = meta.email ? officeAddr : undefined;

  const attachments = [];
  if (receipt) {
    attachments.push({ filename: receipt.fileName || "receipt", content: Buffer.from(receipt.fileBase64, "base64"), contentType: receipt.mimeType });
  }
  if (certificatePreview) {
    attachments.push({ filename: "certificate-preview.png", content: Buffer.from(certificatePreview.fileBase64, "base64"), contentType: certificatePreview.mimeType || "image/png" });
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const siteUrl = process.env.SITE_URL || "https://kalaonline.com";
  const row = (label, value) =>
    `<tr><td style="padding:6px 0;color:#5c6f66;font-size:13px;width:150px;vertical-align:top;">${label}</td>` +
    `<td style="padding:6px 0;color:#1a2a25;font-size:14px;font-weight:600;">${value}</td></tr>`;

  const html = `
<div style="background:#e9e4d8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#f4f0e6;border-radius:6px;overflow:hidden;border:1px solid #d8cdb5;">
    <tr>
      <td style="background:#0f1f1b;padding:28px 32px;text-align:center;">
        <div style="color:#f4f0e6;font-size:20px;font-weight:700;letter-spacing:0.02em;">KARNATAKA STATE LIBRARY ASSOCIATION</div>
        <div style="color:#d9a960;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-top:6px;">Reg. No. 829/88-89</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <div style="color:#c2873f;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Membership application received</div>
        <p style="color:#1a2a25;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Thank you for applying to the Karnataka State Library Association, <b>${esc(meta.name)}</b>.
        </p>
        <p style="color:#5c6f66;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Your application has been received and is under review. Attached is a copy of your payment
          receipt and a preview of your certificate for your records — the membership number and
          verification date shown will be filled in once the application is approved.
        </p>
        <table role="presentation" width="100%" style="border-top:1px solid #d8cdb5;border-bottom:1px solid #d8cdb5;margin-bottom:20px;">
          ${row("Name", esc(meta.name))}
          ${row("Email", esc(meta.email) || "—")}
          ${row("Mobile", esc(meta.mobile) || "—")}
          ${row("Membership type", esc(meta.membershipType))}
          ${row("Reference code", esc(meta.certificateRef))}
        </table>
        <p style="color:#5c6f66;font-size:13.5px;line-height:1.7;margin:0;">
          Save your reference code — use it at
          <a href="${siteUrl}/certificate" style="color:#9a6a28;">${siteUrl}/certificate</a>
          to check your status or view your final certificate once approved.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#0f1f1b;padding:16px 32px;text-align:center;color:#9db5a8;font-size:11px;letter-spacing:0.06em;">
        Karnataka State Library Association (R) · karnatakalibraryassociation@gmail.com
      </td>
    </tr>
  </table>
</div>`;

  const text = [
    `Thank you for applying to the Karnataka State Library Association, ${meta.name}.`,
    "",
    "Your membership application has been received and is under review. Attached is a copy of your " +
      "payment receipt and a preview of your certificate for your records — the membership number and " +
      "verification date shown will be filled in once the application is approved.",
    "",
    "Application details:",
    `Name: ${meta.name}`,
    `Email: ${meta.email || "-"}`,
    `Mobile: ${meta.mobile || "-"}`,
    `Membership type: ${meta.membershipType}`,
    `Reference code: ${meta.certificateRef}`,
    "",
    `Use the reference code above to check your status or view your final certificate later at: ${siteUrl}/certificate`,
  ].join("\n");

  await transport.sendMail({
    from: `"Karnataka State Library Association" <${process.env.GMAIL_USER}>`,
    to,
    cc,
    subject: `KALA membership application received — ${meta.name}`,
    text,
    html,
    attachments,
  });
  return true;
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authorised" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired — sign in again" });
  }
}

// ---- public --------------------------------------------------------------

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Submit a membership application.
app.post("/api/membership", async (req, res) => {
  try {
    if (!req.body?.name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const certRef = genCertRef();

    const meta = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      membershipType: req.body.membership_type,
      certificateRef: certRef,
    };

    let receiptEmailed = false;
    try {
      receiptEmailed = await emailNotification(req.body.receipt, req.body.certificatePreview, meta);
    } catch (err) {
      // Don't lose the whole application over an email hiccup — the
      // office can chase the receipt separately if this happens.
      console.error("notification email error:", err.message);
    }

    const { cols, vals } = pick(req.body, WRITABLE);
    cols.push("status", "source", "certificate_ref", "receipt_emailed");
    const certRefIdx = vals.length + 2; // index of certificate_ref within vals, after the two pushes below
    vals.push("pending", "form", certRef, receiptEmailed);
    const ph = vals.map((_, i) => `$${i + 1}`).join(", ");

    // Retry a couple of times in the astronomically unlikely event of a
    // certificate_ref collision (unique index on the column).
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await q(
          `INSERT INTO members (${cols.join(", ")}) VALUES (${ph}) RETURNING id, certificate_ref`,
          vals
        );
        return res.status(201).json({ ok: true, id: rows[0].id, certificate_ref: rows[0].certificate_ref });
      } catch (err) {
        if (err.code === "23505" && attempt < 4) {
          vals[certRefIdx] = genCertRef();
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    console.error("submit error:", err.message);
    res.status(500).json({ error: "Could not save your application. Please try again." });
  }
});

// Public: fetch the current certificate placeholder layout.
app.get("/api/certificate/layout", async (_req, res) => {
  const { rows } = await q(`SELECT value FROM settings WHERE key = 'certificate_layout'`);
  res.json(rows[0]?.value || DEFAULT_LAYOUT);
});

// Public: someone filling the membership form nudged the placeholder
// positions in their live preview. This never touches the live layout —
// it just parks a suggestion for the office to review and approve (or
// discard) from the admin panel. Only one pending suggestion is kept at
// a time; a newer one replaces an unreviewed older one.
app.post("/api/certificate/layout/propose", async (req, res) => {
  try {
    await q(
      `INSERT INTO settings (key, value, updated_at) VALUES ('certificate_layout_pending', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
      [JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("layout propose error:", err.message);
    res.status(500).json({ error: "Could not save suggestion" });
  }
});

// Public: look up a member's certificate by their reference code.
app.get("/api/certificate/lookup", async (req, res) => {
  const ref = (req.query.ref || "").trim().toUpperCase();
  if (!ref) return res.status(400).json({ error: "Reference code is required" });
  const { rows } = await q(
    `SELECT status, name, membership_type, membership_no, verified_date FROM members WHERE certificate_ref = $1`,
    [ref]
  );
  if (!rows.length) return res.status(404).json({ error: "No application found for that reference code" });
  const m = rows[0];
  if (m.status !== "active") {
    return res.json({ status: m.status, name: m.name, membership_type: m.membership_type });
  }
  res.json(m);
});

// ---- admin auth ----------------------------------------------------------

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ u: username }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token, username });
  }
  return res.status(401).json({ error: "Incorrect username or password" });
});

// ---- admin: members ------------------------------------------------------

app.get("/api/admin/stats", auth, async (_req, res) => {
  const { rows } = await q(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'pending')::int  AS pending,
      count(*) FILTER (WHERE status = 'active')::int   AS active,
      count(*) FILTER (WHERE status = 'rejected')::int AS rejected
    FROM members
  `);
  res.json(rows[0]);
});

app.get("/api/admin/members", auth, async (req, res) => {
  const { status, q: search } = req.query;
  const where = [];
  const params = [];
  if (status && status !== "all") {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(name ILIKE $${params.length} OR email ILIKE $${params.length} OR designation ILIKE $${params.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await q(
    `SELECT * FROM members ${clause} ORDER BY created_at DESC LIMIT 500`,
    params
  );
  res.json(rows.map(rowToMember));
});

app.get("/api/admin/members/:id", auth, async (req, res) => {
  const { rows } = await q("SELECT * FROM members WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rowToMember(rows[0]));
});

// Admin adds a member directly (defaults to active).
app.post("/api/admin/members", auth, async (req, res) => {
  try {
    if (!req.body?.name?.trim()) return res.status(400).json({ error: "Name is required" });
    const body = { status: "active", source: "manual", ...req.body };
    const { cols, vals } = pick(body, ADMIN_WRITABLE);
    const ph = vals.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await q(
      `INSERT INTO members (${cols.join(", ")}) VALUES (${ph}) RETURNING *`,
      vals
    );
    res.status(201).json(rowToMember(rows[0]));
  } catch (err) {
    console.error("add error:", err.message);
    res.status(500).json({ error: "Could not add member" });
  }
});

// Update a member (status, type, any editable field).
app.patch("/api/admin/members/:id", auth, async (req, res) => {
  try {
    const body = { ...req.body };

    // Approving a member issues a certificate: auto-fill the membership
    // number and verified date the first time, if the admin hasn't already
    // set them by hand.
    if (body.status === "active") {
      const { rows } = await q("SELECT id, membership_type, membership_no, verified_date FROM members WHERE id = $1", [
        req.params.id,
      ]);
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const existing = rows[0];
      if (!existing.membership_no && !body.membership_no) {
        body.membership_no = genMembershipNo(existing);
      }
      if (!existing.verified_date && !body.verified_date) {
        body.verified_date = new Date().toISOString().slice(0, 10);
      }
    }

    const { cols, vals } = pick(body, ADMIN_WRITABLE);
    if (!cols.length) return res.status(400).json({ error: "Nothing to update" });
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    vals.push(req.params.id);
    const { rows } = await q(
      `UPDATE members SET ${set}, updated_at = now() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rowToMember(rows[0]));
  } catch (err) {
    console.error("update error:", err.message);
    res.status(500).json({ error: "Could not update member" });
  }
});

// Admin: update the shared certificate placeholder layout (reads happen via
// the public GET /api/certificate/layout above — same data, no auth needed to view it).
app.put("/api/admin/certificate/layout", auth, async (req, res) => {
  try {
    await q(
      `INSERT INTO settings (key, value, updated_at) VALUES ('certificate_layout', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
      [JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("layout update error:", err.message);
    res.status(500).json({ error: "Could not save layout" });
  }
});

// Admin: read the pending layout suggestion (if any) proposed from the
// public form's live preview.
app.get("/api/admin/certificate/layout/pending", auth, async (_req, res) => {
  const { rows } = await q(`SELECT value, updated_at FROM settings WHERE key = 'certificate_layout_pending'`);
  res.json(rows[0] ? { layout: rows[0].value, proposedAt: rows[0].updated_at } : null);
});

// Admin: approve the pending suggestion — it becomes the live layout,
// and the suggestion slot is cleared.
app.post("/api/admin/certificate/layout/approve", auth, async (_req, res) => {
  try {
    const { rows } = await q(`SELECT value FROM settings WHERE key = 'certificate_layout_pending'`);
    if (!rows.length) return res.status(404).json({ error: "No pending suggestion" });
    await q(
      `INSERT INTO settings (key, value, updated_at) VALUES ('certificate_layout', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
      [JSON.stringify(rows[0].value)]
    );
    await q(`DELETE FROM settings WHERE key = 'certificate_layout_pending'`);
    res.json({ ok: true, layout: rows[0].value });
  } catch (err) {
    console.error("layout approve error:", err.message);
    res.status(500).json({ error: "Could not approve suggestion" });
  }
});

// Admin: discard the pending suggestion without applying it.
app.delete("/api/admin/certificate/layout/pending", auth, async (_req, res) => {
  await q(`DELETE FROM settings WHERE key = 'certificate_layout_pending'`);
  res.json({ ok: true });
});

app.delete("/api/admin/members/:id", auth, async (req, res) => {
  const { rowCount } = await q("DELETE FROM members WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default app;

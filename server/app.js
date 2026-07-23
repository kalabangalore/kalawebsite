import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { q, initSchema, WRITABLE, ADMIN_WRITABLE } from "./db.js";
import { DEFAULT_LAYOUT, genCertRef, genMembershipNo } from "./certificate.js";
import { heroSlides, banners, org } from "../src/data/content.js";
import { hashPin, verifyPin } from "./pin.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Editable home-page content (carousel/banners/contact) — falls back to the
// same values baked into src/data/content.js until an admin saves an override.
const DEFAULT_SITE_CONTENT = {
  heroSlides,
  banners,
  contact: { altPhone: org.altPhone, email: org.email, address: org.address },
};

// Fields a self-claiming legacy member may fill in themselves.
const CLAIM_FIELDS = ["email", "mobile", "date_of_birth", "designation", "membership_type"];

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

// Emails a legacy member's freshly-issued certificate to the address they
// gave when claiming their roster entry (or on a later "resend" request).
async function emailCertificate(member, certificatePreview) {
  const transport = getMailer();
  if (!transport || !member.email) return false;

  const siteUrl = process.env.SITE_URL || "https://kalaonline.com";
  const attachments = certificatePreview
    ? [{ filename: "certificate.png", content: Buffer.from(certificatePreview.fileBase64, "base64"), contentType: certificatePreview.mimeType || "image/png" }]
    : [];

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
        <div style="color:#c2873f;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Your membership certificate</div>
        <p style="color:#1a2a25;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hello <b>${member.name}</b>, here is your certificate for the Karnataka State Library
          Association — attached to this email as an image (PNG).
        </p>
        <table role="presentation" width="100%" style="border-top:1px solid #d8cdb5;border-bottom:1px solid #d8cdb5;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#5c6f66;font-size:13px;width:150px;">Membership No.</td><td style="padding:6px 0;color:#1a2a25;font-size:14px;font-weight:600;">${member.membership_no || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#5c6f66;font-size:13px;width:150px;">Reference code</td><td style="padding:6px 0;color:#1a2a25;font-size:14px;font-weight:600;">${member.certificate_ref}</td></tr>
        </table>
        <p style="color:#5c6f66;font-size:13.5px;line-height:1.7;margin:0;">
          Save your reference code — use it at
          <a href="${siteUrl}/certificate" style="color:#9a6a28;">${siteUrl}/certificate</a>
          any time to view or re-download your certificate.
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
    `Hello ${member.name}, here is your certificate for the Karnataka State Library Association —`,
    "attached to this email as an image (PNG).",
    "",
    `Membership No.: ${member.membership_no || "-"}`,
    `Reference code: ${member.certificate_ref}`,
    "",
    `Use the reference code above any time at ${siteUrl}/certificate to view or re-download your certificate.`,
  ].join("\n");

  await transport.sendMail({
    from: `"Karnataka State Library Association" <${process.env.GMAIL_USER}>`,
    to: member.email,
    subject: "Here is your KALA membership certificate",
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

// Public: search/paginate the pre-2026 legacy roster.
app.get("/api/legacy-members", async (req, res) => {
  const { q: search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const offset = Number(req.query.offset) || 0;
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows: countRows } = await q(`SELECT count(*)::int AS n FROM legacy_members ${clause}`, params);
  params.push(limit, offset);
  const { rows } = await q(
    `SELECT id, name, detail, profile_completed AS claimed
     FROM legacy_members ${clause} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({ total: countRows[0].n, members: rows });
});

// Public: minimal status for one roster entry — just enough for the login
// page to decide whether to show "set your PIN" or "enter your PIN". Never
// exposes member details here; that only happens after a correct PIN.
// "claimed" means they've completed the self-service details form — every
// roster entry already has an underlying member record with an ID.
app.get("/api/legacy-members/:id", async (req, res) => {
  const { rows } = await q(
    "SELECT id, name, (pin_hash IS NOT NULL) AS has_pin, profile_completed AS claimed FROM legacy_members WHERE id = $1",
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Roster entry not found" });
  res.json(rows[0]);
});

// Public: first-time setup — a legacy member picks a PIN for themselves.
// Only allowed once; after this they log in with it instead.
app.post("/api/legacy-members/:id/set-pin", async (req, res) => {
  const pin = String(req.body.pin || "");
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be 4-6 digits" });
  }
  const { rows } = await q("SELECT id, pin_hash, profile_completed FROM legacy_members WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Roster entry not found" });
  if (rows[0].pin_hash) {
    return res.status(409).json({ error: "A PIN is already set for this entry — please log in instead." });
  }
  await q("UPDATE legacy_members SET pin_hash = $1 WHERE id = $2", [hashPin(pin), req.params.id]);
  res.json({ ok: true, claimed: rows[0].profile_completed });
});

// Public: log in with a previously-set PIN. Returns the linked member record
// (for viewing/re-downloading the certificate) if the details form has
// already been completed, otherwise signals the client to continue on to
// that step (their member record + ID already exist either way).
app.post("/api/legacy-members/:id/login", async (req, res) => {
  const { rows } = await q("SELECT * FROM legacy_members WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Roster entry not found" });
  const legacy = rows[0];
  if (!legacy.pin_hash) {
    return res.status(400).json({ error: "No PIN set yet for this entry — set one first." });
  }
  if (!verifyPin(String(req.body.pin || ""), legacy.pin_hash)) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }
  if (!legacy.profile_completed) {
    return res.json({ ok: true, claimed: false });
  }
  const { rows: memberRows } = await q("SELECT * FROM members WHERE id = $1", [legacy.claimed_member_id]);
  res.json({ ok: true, claimed: true, member: memberRows[0] || null });
});

// Public: a legacy roster entry is claimed by the person it belongs to. No
// admin approval — every roster entry already has a member record and ID
// (bulk-assigned, see server/promote-legacy-members.js); this just fills in
// the personal details on that existing record. Requires a PIN to already
// be set (i.e. this follows /set-pin) and an email address, since the
// certificate is delivered by email.
app.post("/api/legacy-members/:id/claim", async (req, res) => {
  try {
    const { rows: legacyRows } = await q("SELECT * FROM legacy_members WHERE id = $1", [req.params.id]);
    if (!legacyRows.length) return res.status(404).json({ error: "Roster entry not found" });
    const legacy = legacyRows[0];
    if (legacy.profile_completed) {
      return res.status(409).json({ error: "This membership has already been claimed." });
    }
    if (!legacy.pin_hash) {
      return res.status(400).json({ error: "Set a PIN before completing your details." });
    }
    if (!req.body.email?.trim()) {
      return res.status(400).json({ error: "An email address is required so we can send your certificate." });
    }

    const membershipType = ["life", "institutional", "student"].includes(req.body.membership_type)
      ? req.body.membership_type
      : "life";

    let member;
    if (legacy.claimed_member_id) {
      // The normal path: this roster entry already has a pre-assigned
      // member record (every legacy row does, post-migration) — fill in
      // the personal details on it, regenerating the membership number
      // only if the type actually changed from the bulk-assigned default.
      const { cols, vals } = pick({ ...req.body, membership_type: membershipType }, CLAIM_FIELDS);
      vals.push(legacy.claimed_member_id);
      const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
      const { rows } = await q(
        `UPDATE members SET ${set}, updated_at = now() WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      member = rows[0];
      if (member.membership_type !== membershipType || !member.membership_no) {
        member.membership_no = genMembershipNo(member);
        await q("UPDATE members SET membership_no = $1, membership_type = $2 WHERE id = $3", [
          member.membership_no,
          membershipType,
          member.id,
        ]);
        member.membership_type = membershipType;
      }
    } else {
      // Defensive fallback for a roster entry that somehow has no linked
      // member record yet (shouldn't happen after the one-time migration).
      const certRef = genCertRef();
      const verifiedDate = new Date().toISOString().slice(0, 10);
      const { cols, vals } = pick({ ...req.body, membership_type: membershipType }, CLAIM_FIELDS);
      cols.push("name", "status", "source", "certificate_ref", "verified_date", "notes");
      vals.push(legacy.name, "active", "legacy_claim", certRef, verifiedDate, legacy.detail || null);
      const ph = vals.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await q(`INSERT INTO members (${cols.join(", ")}) VALUES (${ph}) RETURNING *`, vals);
      member = rows[0];
      member.membership_no = genMembershipNo(member);
      await q("UPDATE members SET membership_no = $1 WHERE id = $2", [member.membership_no, member.id]);
      await q("UPDATE legacy_members SET claimed_member_id = $1 WHERE id = $2", [member.id, legacy.id]);
    }

    await q("UPDATE legacy_members SET profile_completed = true WHERE id = $1", [legacy.id]);

    res.status(201).json({ ok: true, member });
  } catch (err) {
    console.error("legacy claim error:", err.message);
    res.status(500).json({ error: "Could not complete your claim. Please try again." });
  }
});

// Public: email the (client-rendered) certificate image to a claimed legacy
// member's address — used right after claiming, and for a "resend" action
// on later logins.
app.post("/api/legacy-members/:id/email-certificate", async (req, res) => {
  try {
    const { rows } = await q("SELECT claimed_member_id FROM legacy_members WHERE id = $1", [req.params.id]);
    if (!rows.length || !rows[0].claimed_member_id) {
      return res.status(404).json({ error: "This entry hasn't been claimed yet" });
    }
    const { rows: memberRows } = await q("SELECT * FROM members WHERE id = $1", [rows[0].claimed_member_id]);
    if (!memberRows.length) return res.status(404).json({ error: "Member not found" });
    const sent = await emailCertificate(memberRows[0], req.body.certificatePreview);
    res.json({ ok: true, emailed: sent });
  } catch (err) {
    console.error("email certificate error:", err.message);
    res.status(500).json({ error: "Could not email the certificate" });
  }
});

// Public: current home-page content (carousel, banners, contact details).
app.get("/api/site-content", async (_req, res) => {
  const { rows } = await q(`SELECT value FROM settings WHERE key = 'site_content'`);
  res.json({ ...DEFAULT_SITE_CONTENT, ...(rows[0]?.value || {}) });
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

// Admin: update the home-page carousel/banners/contact details (reads
// happen via the public GET /api/site-content above).
app.put("/api/admin/site-content", auth, async (req, res) => {
  try {
    await q(
      `INSERT INTO settings (key, value, updated_at) VALUES ('site_content', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
      [JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("site content update error:", err.message);
    res.status(500).json({ error: "Could not save site content" });
  }
});

app.delete("/api/admin/members/:id", auth, async (req, res) => {
  const { rowCount } = await q("DELETE FROM members WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default app;

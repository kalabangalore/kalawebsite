import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
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

// Forwards a base64 payment receipt to the Apps Script webhook (see
// scripts/payment-receipt-apps-script.gs), which saves it to Drive and
// logs a row in Sheets. We only ever store the returned link — never the
// file itself — so Postgres storage doesn't grow with uploads.
async function uploadReceipt(receipt, meta) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    console.warn("APPS_SCRIPT_URL not set — skipping receipt upload");
    return null;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...receipt, ...meta }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Receipt upload failed");
  return data.url;
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

    let receiptUrl = null;
    if (req.body.receipt) {
      try {
        receiptUrl = await uploadReceipt(req.body.receipt, {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          membershipType: req.body.membership_type,
        });
      } catch (err) {
        // Don't lose the whole application over an upload hiccup — the
        // office can chase the receipt separately if this happens.
        console.error("receipt upload error:", err.message);
      }
    }

    const { cols, vals } = pick(req.body, WRITABLE);
    cols.push("status", "source", "certificate_ref", "payment_receipt_url");
    const certRefIdx = vals.length + 2; // index of certificate_ref within vals, after the two pushes below
    vals.push("pending", "form", genCertRef(), receiptUrl);
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

app.delete("/api/admin/members/:id", auth, async (req, res) => {
  const { rowCount } = await q("DELETE FROM members WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default app;

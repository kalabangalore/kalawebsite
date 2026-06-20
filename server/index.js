import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { pool, q, initSchema, WRITABLE, ADMIN_WRITABLE } from "./db.js";

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

function rowToMember(r) {
  return r; // experience comes back as parsed JSON from pg
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
    const { cols, vals } = pick(req.body, WRITABLE);
    cols.push("status", "source");
    vals.push("pending", "form");
    const ph = vals.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await q(
      `INSERT INTO members (${cols.join(", ")}) VALUES (${ph}) RETURNING id`,
      vals
    );
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("submit error:", err.message);
    res.status(500).json({ error: "Could not save your application. Please try again." });
  }
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
    const { cols, vals } = pick(req.body, ADMIN_WRITABLE);
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

app.delete("/api/admin/members/:id", auth, async (req, res) => {
  const { rowCount } = await q("DELETE FROM members WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- boot ----------------------------------------------------------------

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`✓ KALA API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to init schema:", err.message);
    process.exit(1);
  });

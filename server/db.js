import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Local: load server/.env. On Vercel this file is absent and the vars
// come from the project's Environment Variables instead (harmless no-op).
dotenv.config({ path: path.join(__dirname, ".env") });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Don't process.exit() — that would crash a serverless instance.
  // Throw so the request handler can return a clean 500 instead.
  throw new Error("Missing DATABASE_URL environment variable");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const q = (text, params) => pool.query(text, params);

// Create the members table if it doesn't exist.
export async function initSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS members (
      id              SERIAL PRIMARY KEY,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      status          TEXT NOT NULL DEFAULT 'pending',   -- pending | active | rejected
      membership_type TEXT NOT NULL DEFAULT 'life',      -- life | institutional | student
      source          TEXT NOT NULL DEFAULT 'form',      -- form | manual

      name            TEXT NOT NULL,
      designation     TEXT,

      office_address    TEXT,
      office_pin        TEXT,
      office_telephone  TEXT,
      mobile            TEXT,
      residence_address TEXT,
      residence_pin     TEXT,
      email             TEXT,

      date_of_birth     TEXT,

      qual_academic     TEXT,
      qual_professional TEXT,
      qual_others       TEXT,

      experience        JSONB NOT NULL DEFAULT '[]'::jsonb,

      inst_address        TEXT,
      inst_contact_person TEXT,
      inst_designation    TEXT,
      inst_telephone      TEXT,

      -- office use
      receipt_no    TEXT,
      amount_paid   NUMERIC,
      admitted_as   TEXT,
      notes         TEXT
    );
  `);

  // Columns added after the table's initial release — CREATE TABLE IF NOT
  // EXISTS is a no-op on an existing table, so these need their own
  // idempotent ALTERs to reach databases that predate them.
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS certificate_ref TEXT;`);
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_no TEXT;`);
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS verified_date TEXT;`);
  // Link to the payment receipt file, stored in Drive (via the Apps Script
  // webhook) rather than in Postgres, so uploads don't bloat the DB.
  // Superseded by receipt_emailed below (receipts are emailed, not
  // uploaded to Drive), but kept for any rows that already used it.
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;`);
  // Whether the payment receipt was successfully emailed (Gmail SMTP) at
  // submission time — the file itself lives in that inbox, never in Postgres.
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS receipt_emailed BOOLEAN NOT NULL DEFAULT false;`);

  await q(`CREATE INDEX IF NOT EXISTS members_status_idx ON members (status);`);
  await q(`CREATE INDEX IF NOT EXISTS members_created_idx ON members (created_at DESC);`);
  await q(
    `CREATE UNIQUE INDEX IF NOT EXISTS members_certificate_ref_idx ON members (certificate_ref) WHERE certificate_ref IS NOT NULL;`
  );

  // Generic key/value settings store — certificate placeholder layout, and
  // the editable home carousel/banners/contact content (key 'site_content').
  await q(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // The pre-2026 membership roster (name + free-text detail only, no
  // structured fields) — imported once from src/data/members.js. A row here
  // becomes a real `members` row (claimed_member_id set) once that person
  // self-claims it and fills in the missing details.
  await q(`
    CREATE TABLE IF NOT EXISTS legacy_members (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      detail            TEXT,
      claimed_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await q(`CREATE INDEX IF NOT EXISTS legacy_members_name_idx ON legacy_members (name);`);
  // Self-set PIN (salt:hash, see server/pin.js) so a legacy member can log
  // back in later to view/resend their certificate without an account system.
  await q(`ALTER TABLE legacy_members ADD COLUMN IF NOT EXISTS pin_hash TEXT;`);

  // Older deployments may have created the FK without ON DELETE SET NULL —
  // fix it in place so deleting a claimed member frees up their roster entry
  // instead of failing.
  await q(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'legacy_members_claimed_member_id_fkey' AND confdeltype != 'n'
      ) THEN
        ALTER TABLE legacy_members DROP CONSTRAINT legacy_members_claimed_member_id_fkey;
        ALTER TABLE legacy_members
          ADD CONSTRAINT legacy_members_claimed_member_id_fkey
          FOREIGN KEY (claimed_member_id) REFERENCES members(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
}

// Columns clients are allowed to write (applicant + admin editable).
export const WRITABLE = [
  "membership_type",
  "name",
  "designation",
  "office_address",
  "office_pin",
  "office_telephone",
  "mobile",
  "residence_address",
  "residence_pin",
  "email",
  "date_of_birth",
  "qual_academic",
  "qual_professional",
  "qual_others",
  "experience",
  "inst_address",
  "inst_contact_person",
  "inst_designation",
  "inst_telephone",
];

export const ADMIN_WRITABLE = [
  ...WRITABLE,
  "status",
  "source",
  "receipt_no",
  "amount_paid",
  "admitted_as",
  "notes",
  "membership_no",
  "verified_date",
  "payment_receipt_url",
  "receipt_emailed",
];

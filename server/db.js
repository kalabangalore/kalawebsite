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
  await q(`ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;`);

  await q(`CREATE INDEX IF NOT EXISTS members_status_idx ON members (status);`);
  await q(`CREATE INDEX IF NOT EXISTS members_created_idx ON members (created_at DESC);`);
  await q(
    `CREATE UNIQUE INDEX IF NOT EXISTS members_certificate_ref_idx ON members (certificate_ref) WHERE certificate_ref IS NOT NULL;`
  );

  // Generic key/value settings store — currently just the certificate placeholder layout.
  await q(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
];

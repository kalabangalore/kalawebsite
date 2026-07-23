// One-off import of the static pre-2026 roster (src/data/members.js) into
// the legacy_members table. Safe to re-run: skips if legacy_members already
// has rows, so it never double-imports.
import { initSchema, pool, q } from "./db.js";
import { members } from "../src/data/members.js";

try {
  await initSchema();

  const { rows } = await q("SELECT count(*)::int AS n FROM legacy_members");
  if (rows[0].n > 0) {
    console.log(`legacy_members already has ${rows[0].n} row(s) — skipping import.`);
  } else {
    let inserted = 0;
    for (const m of members) {
      await q("INSERT INTO legacy_members (name, detail) VALUES ($1, $2)", [m.name, m.detail || null]);
      inserted++;
    }
    console.log(`✓ Imported ${inserted} legacy members.`);
  }
} catch (err) {
  console.error("✗ Legacy import failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

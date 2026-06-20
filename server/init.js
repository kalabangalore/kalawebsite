import { initSchema, pool, q } from "./db.js";

try {
  await initSchema();
  const { rows } = await q("SELECT count(*)::int AS n FROM members");
  console.log(`✓ Schema ready. members table has ${rows[0].n} row(s).`);
} catch (err) {
  console.error("✗ DB init failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

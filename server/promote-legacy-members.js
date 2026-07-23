// One-off migration: give every legacy_members row a real members row +
// membership ID up front, instead of waiting for self-claim. Safe to re-run
// — only touches rows that don't have a linked member yet.
import { initSchema, pool, q } from "./db.js";
import { genCertRef } from "./certificate.js";

const BATCH = 200;

try {
  await initSchema();

  // Anyone who already went through the old claim flow (before this
  // migration existed) has genuinely completed their profile.
  await q(
    `UPDATE legacy_members SET profile_completed = true
     WHERE claimed_member_id IS NOT NULL AND profile_completed = false`
  );

  const { rows: pending } = await q(
    `SELECT id, name, detail FROM legacy_members WHERE claimed_member_id IS NULL ORDER BY id`
  );
  console.log(`${pending.length} legacy entries need a member record.`);

  const verifiedDate = new Date().toISOString().slice(0, 10);
  let done = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const certRefs = batch.map(() => genCertRef());

    const cols = ["name", "membership_type", "status", "source", "certificate_ref", "verified_date", "notes"];
    const vals = [];
    const rowsSql = batch
      .map((b, idx) => {
        const base = idx * cols.length;
        vals.push(b.name, "life", "active", "legacy_import", certRefs[idx], verifiedDate, b.detail || null);
        return `(${cols.map((_, j) => `$${base + j + 1}`).join(", ")})`;
      })
      .join(", ");
    await q(`INSERT INTO members (${cols.join(", ")}) VALUES ${rowsSql}`, vals);

    // Membership number computed straight from each row's own id — matches
    // certificate.js's genMembershipNo format (KALA-<type initial>-<year>-<padded id>).
    await q(
      `UPDATE members
       SET membership_no = 'KALA-' || UPPER(LEFT(membership_type, 1)) || '-' || date_part('year', now())::int || '-' || LPAD(id::text, 6, '0')
       WHERE membership_no IS NULL AND certificate_ref = ANY($1::text[])`,
      [certRefs]
    );

    const mapVals = [];
    const mapRows = batch
      .map((b, idx) => {
        const base = idx * 2;
        mapVals.push(b.id, certRefs[idx]);
        return `($${base + 1}::int, $${base + 2}::text)`;
      })
      .join(", ");
    await q(
      `UPDATE legacy_members lm
       SET claimed_member_id = m.id
       FROM members m, (VALUES ${mapRows}) AS map(lid, cref)
       WHERE lm.id = map.lid AND m.certificate_ref = map.cref`,
      mapVals
    );

    done += batch.length;
    console.log(`${done}/${pending.length} promoted...`);
  }

  console.log("✓ All legacy members now have a member record and membership ID.");
} catch (err) {
  console.error("✗ Promotion failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

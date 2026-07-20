import { useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { members } from "../data/members";

const STEP = 60;

export default function Members() {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(STEP);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => m.name.toLowerCase().includes(term));
  }, [q]);

  const shown = filtered.slice(0, limit);

  return (
    <>
      <PageHead
        crumb={<span>Members</span>}
        title="The membership roll"
        lead="More than fifteen hundred library and information professionals across Karnataka and beyond. Search by name."
      />

      <section className="section paper-bg">
        <div className="wrap">
          <div className="dirtools">
            <label className="search">
              <span className="ic">⌕</span>
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setLimit(STEP);
                }}
                placeholder="Search members by name…"
                aria-label="Search members"
              />
            </label>
            <span className="dircount">
              {filtered.length.toLocaleString()} {filtered.length === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="dirlist">
            {shown.map((m, i) => (
              <motion.div
                className="dirrow"
                key={`${m.name}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.min(i % STEP, 12) * 0.01 }}
              >
                <div className="dirrow__idx">{String(i + 1).padStart(4, "0")}</div>
                <div>
                  <div className="dirrow__name">{m.name}</div>
                  {m.detail && <div className="dirrow__detail">{m.detail}</div>}
                </div>
              </motion.div>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="lead" style={{ marginTop: 30 }}>
              No members match “{q}”. Try a different name.
            </p>
          )}

          {limit < filtered.length && (
            <div className="loadmore">
              <button className="btn btn--ghost" onClick={() => setLimit((l) => l + STEP)}>
                Load more ({filtered.length - limit} remaining)
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

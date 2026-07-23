import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { api } from "../lib/api";

const STEP = 60;

export default function Members() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(STEP);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .listLegacyMembers({ q, limit })
        .then((res) => {
          if (!alive) return;
          setItems(res.members);
          setTotal(res.total);
          setLoading(false);
        })
        .catch(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, limit]);

  return (
    <>
      <PageHead
        crumb={<span>Members</span>}
        title="The membership roll"
        lead="More than fifteen hundred library and information professionals across Karnataka and beyond. Search by name."
      />

      <section className="section paper-bg">
        <div className="wrap">
          <div className="notice" style={{ marginBottom: 30, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="tag">On this list?</span>
              <p style={{ marginTop: 6 }}>Log in with your name and a PIN to get your certificate, issued instantly.</p>
            </div>
            <Link to="/membership#apply" className="btn btn--solid">Existing member login →</Link>
          </div>

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
              {total.toLocaleString()} {total === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="dirlist">
            {items.map((m, i) => (
              <motion.div
                className="dirrow"
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.min(i % STEP, 12) * 0.01 }}
              >
                <div className="dirrow__idx">{String(i + 1).padStart(4, "0")}</div>
                <div>
                  <div className="dirrow__name">{m.name}</div>
                  {m.detail && <div className="dirrow__detail">{m.detail}</div>}
                </div>
                {m.claimed && <span className="dirrow__claimed">Claimed ✓</span>}
              </motion.div>
            ))}
          </div>

          {!loading && items.length === 0 && (
            <p className="lead" style={{ marginTop: 30 }}>
              No members match “{q}”. Try a different name.
            </p>
          )}

          {limit < total && (
            <div className="loadmore">
              <button className="btn btn--ghost" onClick={() => setLimit((l) => l + STEP)}>
                Load more ({total - limit} remaining)
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { api } from "../lib/api";
import CertificateCanvas, { downloadCanvas } from "../components/CertificateCanvas";

const STEP = 60;
const TYPES = [
  { value: "life", label: "Life" },
  { value: "institutional", label: "Institutional" },
  { value: "student", label: "Student" },
];

function ClaimForm({ entry, onClaimed, onCancel }) {
  const [d, setD] = useState({ email: "", mobile: "", date_of_birth: "", designation: "", membership_type: "life" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const s = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await api.claimLegacyMember(entry.id, d);
      onClaimed(res.member);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <form className="cform legacyclaim__form" onSubmit={submit}>
      <p className="formnote">
        Confirming “{entry.name}” is you. Fill in a few details to complete your record — your
        certificate is issued immediately, no office approval needed.
      </p>
      <div className="row2">
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={d.email} onChange={s("email")} placeholder="you@email.com" />
        </div>
        <div className="field">
          <label>Mobile</label>
          <input value={d.mobile} onChange={s("mobile")} placeholder="+91…" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label>Date of birth</label>
          <input type="date" value={d.date_of_birth} onChange={s("date_of_birth")} />
        </div>
        <div className="field">
          <label>Designation</label>
          <input value={d.designation} onChange={s("designation")} placeholder="e.g. Librarian" />
        </div>
      </div>
      <div className="field">
        <label>Membership type</label>
        <select value={d.membership_type} onChange={s("membership_type")}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      {err && <p className="formnote" style={{ color: "#b3402f" }}>{err}</p>}
      <div className="sign" style={{ display: "flex", gap: 12 }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--solid" disabled={busy}>
          {busy ? "Submitting…" : "Confirm — this is me →"}
        </button>
      </div>
    </form>
  );
}

function ClaimedCertificate({ member, layout }) {
  const wrapRef = useRef(null);
  return (
    <motion.div
      className="notice legacyclaim__result"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      ref={wrapRef}
    >
      <span className="tag">Certificate ready</span>
      <h3 style={{ marginTop: 8 }}>Welcome back, {member.name.split(" ")[0]}.</h3>
      <div style={{ marginTop: 16, maxWidth: 640 }}>
        <CertificateCanvas variant="signed" layout={layout} data={member} />
      </div>
      <p className="certref" style={{ marginTop: 16 }}>
        Your reference code: <b>{member.certificate_ref}</b> — save it to look this up again on the{" "}
        <a href="/certificate">certificate page</a>.
      </p>
      <div className="sign" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn--solid"
          onClick={() => downloadCanvas(wrapRef.current, `${member.name}-certificate.png`)}
        >
          Download certificate
        </button>
      </div>
    </motion.div>
  );
}

export default function Members() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(STEP);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [claimedResult, setClaimedResult] = useState(null);
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    api.getCertificateLayout().then(setLayout).catch(() => {});
  }, []);

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

  function handleClaimed(member) {
    setClaimedResult(member);
    setItems((list) => list.map((m) => (m.id === claimingId ? { ...m, claimed: true } : m)));
    setClaimingId(null);
  }

  return (
    <>
      <PageHead
        crumb={<span>Members</span>}
        title="The membership roll"
        lead="More than fifteen hundred library and information professionals across Karnataka and beyond. Search by name — if you're on the list, claim your record to get your certificate."
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
              {total.toLocaleString()} {total === 1 ? "member" : "members"}
            </span>
          </div>

          {claimedResult && <ClaimedCertificate member={claimedResult} layout={layout} />}

          <div className="dirlist">
            {items.map((m, i) => (
              <div key={m.id}>
                <motion.div
                  className="dirrow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(i % STEP, 12) * 0.01 }}
                >
                  <div className="dirrow__idx">{String(i + 1).padStart(4, "0")}</div>
                  <div>
                    <div className="dirrow__name">{m.name}</div>
                    {m.detail && <div className="dirrow__detail">{m.detail}</div>}
                  </div>
                  {m.claimed ? (
                    <span className="dirrow__claimed">Claimed ✓</span>
                  ) : claimingId === m.id ? null : (
                    <button
                      className="btn btn--ghost"
                      onClick={() => {
                        setClaimingId(m.id);
                        setClaimedResult(null);
                      }}
                    >
                      This is me
                    </button>
                  )}
                </motion.div>
                {claimingId === m.id && (
                  <ClaimForm entry={m} onCancel={() => setClaimingId(null)} onClaimed={handleClaimed} />
                )}
              </div>
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

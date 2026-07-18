import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, getToken, setToken, clearToken } from "../lib/api";
import CertificateCanvas from "../components/CertificateCanvas";
import { DEFAULT_LAYOUT } from "../lib/certificate";

const STATUS_LABEL = { pending: "Pending", active: "Active", rejected: "Rejected" };
const TYPE_LABEL = { life: "Life", institutional: "Institutional", student: "Student" };

const SAMPLE_DATA = {
  name: "Jane Doe",
  membership_type: "life",
  membership_no: "KALA-L-2026-000001",
  verified_date: new Date().toISOString().slice(0, 10),
};

const PLACEHOLDER_FIELDS = [
  { key: "membershipNo", label: "Membership No.", fields: ["x", "y", "fontSize"] },
  { key: "name", label: "Name", fields: ["x", "y", "fontSize"] },
  { key: "body", label: "Body paragraph", fields: ["x", "y", "width", "height", "fontSize"] },
];

const FIELD_LABEL = { x: "X %", y: "Top %", width: "Width %", height: "Height %", fontSize: "Font size" };

/* ---------------------------------------------------- certificate layout */
function CertificateLayout() {
  const [layout, setLayout] = useState(null);
  const [variant, setVariant] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCertificateLayout()
      .then((l) => setLayout({ ...DEFAULT_LAYOUT, ...l }))
      .catch((e) => setError(e.message));
  }, []);

  function update(key, field, value) {
    setSaved(false);
    setLayout((l) => ({
      ...l,
      [key]: {
        ...l[key],
        [field]: field === "fontSize" ? Number(value) : Number(value) / 100,
      },
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.updateCertificateLayout(layout);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!layout) return <p className="formnote" style={{ padding: "24px 8px" }}>Loading layout…</p>;

  return (
    <div className="certlayout">
      <div className="certlayout__grid">
        <div className="certlayout__fields">
          {PLACEHOLDER_FIELDS.map((pf) => (
            <fieldset className="mfieldset" key={pf.key}>
              <legend>{pf.label}</legend>
              <div className="row2">
                {pf.fields.map((f) => (
                  <div className="field" key={f}>
                    <label>{FIELD_LABEL[f]}</label>
                    <input
                      type="number"
                      step={f === "fontSize" ? 1 : 0.1}
                      value={f === "fontSize" ? layout[pf.key][f] : Math.round(layout[pf.key][f] * 1000) / 10}
                      onChange={(e) => update(pf.key, f, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="seg" style={{ marginTop: 4 }}>
            <button className={variant === "draft" ? "is-on" : ""} onClick={() => setVariant("draft")}>
              Draft
            </button>
            <button className={variant === "signed" ? "is-on" : ""} onClick={() => setVariant("signed")}>
              Signed
            </button>
          </div>

          {error && <p className="formnote" style={{ color: "#b3402f" }}>{error}</p>}
          <button className="btn btn--solid" disabled={saving} onClick={save} style={{ alignSelf: "flex-start" }}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save layout"}
          </button>
        </div>

        <div className="certlayout__preview">
          <CertificateCanvas variant={variant} layout={layout} data={SAMPLE_DATA} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ login */
function Login({ onIn }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { token } = await api.login(u, p);
      setToken(token);
      onIn();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminlogin">
      <motion.form
        className="adminlogin__card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow">KALA Administration</span>
        <h1 className="h-display" style={{ fontSize: 38, margin: "10px 0 6px" }}>Sign in</h1>
        <p className="formnote" style={{ marginBottom: 20 }}>Manage membership applications and members.</p>
        <div className="field">
          <label>Username</label>
          <input value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Password</label>
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        {err && <p className="formnote" style={{ color: "#b3402f", marginTop: 14 }}>{err}</p>}
        <button className="btn btn--solid" disabled={busy} style={{ marginTop: 22, width: "100%", justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in →"}
        </button>
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------- detail modal */
function Detail({ m, onClose, onChange, onDelete }) {
  const [showCert, setShowCert] = useState(false);
  const [layout, setLayout] = useState(null);

  function togglePreview() {
    if (!showCert && !layout) api.getCertificateLayout().then(setLayout).catch(() => {});
    setShowCert((s) => !s);
  }

  const row = (k, v) => v && (
    <div className="drow"><span>{k}</span><b>{v}</b></div>
  );
  return (
    <motion.div className="modalwrap" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
        <div className="modal__head">
          <div>
            <span className="catcard__role">{TYPE_LABEL[m.membership_type]} · {STATUS_LABEL[m.status]}</span>
            <h3 style={{ fontFamily: "var(--primary)", fontSize: 28 }}>{m.name}</h3>
          </div>
          <button className="modal__x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal__body">
          {row("Designation", m.designation)}
          {row("Mobile", m.mobile)}
          {row("E-mail", m.email)}
          {row("Date of birth", m.date_of_birth)}
          {row("Office", [m.office_address, m.office_pin, m.office_telephone].filter(Boolean).join(" · "))}
          {row("Residence", [m.residence_address, m.residence_pin].filter(Boolean).join(" · "))}
          {row("Academic", m.qual_academic)}
          {row("Professional", m.qual_professional)}
          {row("Other quals", m.qual_others)}
          {m.experience?.length > 0 && (
            <div className="drow drow--block">
              <span>Experience</span>
              <div>
                {m.experience.map((x, i) => (
                  <div key={i} className="expitem">{[x.institution, x.period, x.designation].filter(Boolean).join(" — ")}</div>
                ))}
              </div>
            </div>
          )}
          {m.membership_type === "institutional" && (
            <>
              {row("Institution", m.inst_address)}
              {row("Contact person", m.inst_contact_person)}
              {row("Inst. designation", m.inst_designation)}
              {row("Inst. telephone", m.inst_telephone)}
            </>
          )}
          {row("Reference code", m.certificate_ref)}
          {row("Membership No.", m.membership_no)}
          {row("Verified date", m.verified_date)}
          {row("Submitted", new Date(m.created_at).toLocaleString())}

          {showCert && (
            <div className="drow drow--block">
              <span>Certificate</span>
              <CertificateCanvas variant={m.status === "active" ? "signed" : "draft"} layout={layout} data={m} />
            </div>
          )}
        </div>

        <div className="modal__actions">
          <div className="seg">
            {["pending", "active", "rejected"].map((s) => (
              <button key={s} className={m.status === s ? "is-on" : ""} onClick={() => onChange(m.id, { status: s })}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <button className="btn btn--ghost" onClick={togglePreview}>
            {showCert ? "Hide certificate" : "Preview certificate"}
          </button>
          <button className="btn btn--ghost danger" onClick={() => onDelete(m.id)}>Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------------------------------------- add member form */
function AddForm({ onAdd, onClose }) {
  const [d, setD] = useState({ name: "", designation: "", email: "", mobile: "", membership_type: "life", status: "active" });
  const s = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));
  const [busy, setBusy] = useState(false);
  return (
    <motion.div className="modalwrap" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form className="modal" onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onAdd(d); setBusy(false); }}>
        <div className="modal__head">
          <h3 style={{ fontFamily: "var(--primary)", fontSize: 26 }}>Add a member</h3>
          <button type="button" className="modal__x" onClick={onClose}>×</button>
        </div>
        <div className="modal__body cform">
          <div className="field"><label>Name *</label><input required value={d.name} onChange={s("name")} /></div>
          <div className="row2">
            <div className="field"><label>Designation</label><input value={d.designation} onChange={s("designation")} /></div>
            <div className="field"><label>Mobile</label><input value={d.mobile} onChange={s("mobile")} /></div>
          </div>
          <div className="field"><label>E-mail</label><input type="email" value={d.email} onChange={s("email")} /></div>
          <div className="row2">
            <div className="field"><label>Type</label>
              <select value={d.membership_type} onChange={s("membership_type")}>
                <option value="life">Life</option><option value="institutional">Institutional</option><option value="student">Student</option>
              </select>
            </div>
            <div className="field"><label>Status</label>
              <select value={d.status} onChange={s("status")}>
                <option value="active">Active</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn btn--solid" disabled={busy}>{busy ? "Adding…" : "Add member"}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ dashboard */
function Dashboard({ onOut }) {
  const [view, setView] = useState("members"); // members | layout
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        api.stats(),
        api.listMembers({ status: filter, q: search }),
      ]);
      setStats(s);
      setMembers(list);
      setError("");
    } catch (e) {
      if (e.status === 401) { clearToken(); onOut(); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter, search, onOut]);

  useEffect(() => { load(); }, [load]);

  async function change(id, patch) {
    const updated = await api.updateMember(id, patch);
    setMembers((ms) => ms.map((m) => (m.id === id ? updated : m)));
    setActive((a) => (a && a.id === id ? updated : a));
    api.stats().then(setStats).catch(() => {});
  }
  async function remove(id) {
    if (!confirm("Delete this member permanently?")) return;
    await api.deleteMember(id);
    setMembers((ms) => ms.filter((m) => m.id !== id));
    setActive(null);
    api.stats().then(setStats).catch(() => {});
  }
  async function add(d) {
    const created = await api.addMember(d);
    setAdding(false);
    setMembers((ms) => [created, ...ms]);
    api.stats().then(setStats).catch(() => {});
  }

  return (
    <div className="admin">
      <div className="admin__bar">
        <div className="admin__brand">
          <span className="eyebrow">KALA Administration</span>
          <h1 className="h-display" style={{ fontSize: 30 }}>Membership desk</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="seg">
            <button className={view === "members" ? "is-on" : ""} onClick={() => setView("members")}>Members</button>
            <button className={view === "layout" ? "is-on" : ""} onClick={() => setView("layout")}>Certificate layout</button>
          </div>
          {view === "members" && <button className="btn btn--solid" onClick={() => setAdding(true)}>+ Add member</button>}
          <button className="btn btn--ghost" onClick={() => { clearToken(); onOut(); }}>Sign out</button>
        </div>
      </div>

      {view === "layout" ? (
        <CertificateLayout />
      ) : (
      <>
      <div className="admin__stats">
        {[
          ["Total", stats?.total, "all"],
          ["Pending", stats?.pending, "pending"],
          ["Active", stats?.active, "active"],
          ["Rejected", stats?.rejected, "rejected"],
        ].map(([label, n, key]) => (
          <button key={key} className={`astat ${filter === key ? "is-on" : ""}`} onClick={() => setFilter(key)}>
            <span className="astat__n">{n ?? "—"}</span>
            <span className="astat__l">{label}</span>
          </button>
        ))}
      </div>

      <div className="dirtools">
        <label className="search">
          <span className="ic">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, designation…" />
        </label>
        <span className="dircount">{members.length} shown</span>
      </div>

      {error && <p className="formnote" style={{ color: "#b3402f" }}>{error}</p>}

      <div className="atable">
        <div className="atable__head">
          <span>Name</span><span>Type</span><span>Contact</span><span>Status</span><span>Submitted</span>
        </div>
        <AnimatePresence initial={false}>
          {members.map((m) => (
            <motion.button
              key={m.id}
              className="atable__row"
              onClick={() => setActive(m)}
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <span className="atable__name">{m.name}{m.source === "manual" && <em> · added</em>}</span>
              <span>{TYPE_LABEL[m.membership_type]}</span>
              <span className="atable__contact">{m.email || m.mobile || "—"}</span>
              <span><i className={`pill pill--${m.status}`}>{STATUS_LABEL[m.status]}</i></span>
              <span className="atable__date">{new Date(m.created_at).toLocaleDateString()}</span>
            </motion.button>
          ))}
        </AnimatePresence>
        {!loading && members.length === 0 && <p className="formnote" style={{ padding: "24px 8px" }}>No members in this view yet.</p>}
        {loading && <p className="formnote" style={{ padding: "24px 8px" }}>Loading…</p>}
      </div>
      </>
      )}

      <AnimatePresence>
        {active && <Detail m={active} onClose={() => setActive(null)} onChange={change} onDelete={remove} />}
        {adding && <AddForm onAdd={add} onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------------- entry */
export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken());
  return (
    <div className="adminpage">
      {authed ? <Dashboard onOut={() => setAuthed(false)} /> : <Login onIn={() => setAuthed(true)} />}
    </div>
  );
}

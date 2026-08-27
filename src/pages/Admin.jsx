import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, getToken, setToken, clearToken } from "../lib/api";
import CertificateCanvas, { canvasToAttachment } from "../components/CertificateCanvas";
import { DEFAULT_LAYOUT } from "../lib/certificate";
import { COUNCIL_ROLES, DEFAULT_NAV_LINKS } from "../data/siteContentDefaults";

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
];

const FIELD_LABEL = { x: "X %", y: "Top %", fontSize: "Font size" };

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Plain-text dump of every field on a member, for the "Copy" action — same
// field set/order as the Detail modal below, so what you see is what you get.
function formatMemberDetails(m) {
  const lines = [
    ["Name", m.name],
    ["Membership type", TYPE_LABEL[m.membership_type]],
    ["Status", STATUS_LABEL[m.status]],
    ["Designation", m.designation],
    ["Mobile", m.mobile],
    ["E-mail", m.email],
    ["Date of birth", m.date_of_birth],
    ["Office", [m.office_address, m.office_pin, m.office_telephone].filter(Boolean).join(" · ")],
    ["Residence", [m.residence_address, m.residence_pin].filter(Boolean).join(" · ")],
    ["Academic", m.qual_academic],
    ["Professional", m.qual_professional],
    ["Other quals", m.qual_others],
  ];
  if (m.membership_type === "institutional") {
    lines.push(
      ["Institution", m.inst_address],
      ["Contact person", m.inst_contact_person],
      ["Inst. designation", m.inst_designation],
      ["Inst. telephone", m.inst_telephone]
    );
  }
  lines.push(
    ["Reference code", m.certificate_ref],
    ["Membership No.", m.membership_no],
    ["Verified date", m.verified_date],
    ["Submitted", m.created_at ? new Date(m.created_at).toLocaleString() : ""]
  );
  return lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
}

/* ---------------------------------------------------- certificate layout */
function CertificateLayout() {
  const [layout, setLayout] = useState(null);
  const [variant, setVariant] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  const [pending, setPending] = useState(null);
  const [pendingError, setPendingError] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    api
      .getCertificateLayout()
      .then((l) => setLayout({ ...DEFAULT_LAYOUT, ...l }))
      .catch((e) => setError(e.message));
    loadPending();
  }, []);

  function loadPending() {
    api
      .getPendingCertificateLayout()
      .then((p) => setPending(p ? { ...DEFAULT_LAYOUT, ...p.layout, __proposedAt: p.proposedAt } : null))
      .catch(() => {});
  }

  async function approvePending() {
    setReviewing(true);
    setPendingError("");
    try {
      const res = await api.approvePendingCertificateLayout();
      setLayout({ ...DEFAULT_LAYOUT, ...res.layout });
      setPending(null);
    } catch (e) {
      setPendingError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  async function discardPending() {
    setReviewing(true);
    setPendingError("");
    try {
      await api.discardPendingCertificateLayout();
      setPending(null);
    } catch (e) {
      setPendingError(e.message);
    } finally {
      setReviewing(false);
    }
  }

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

  function patch(key, next) {
    setSaved(false);
    setLayout((l) => ({ ...l, [key]: { ...l[key], ...next } }));
  }

  function onDragMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dxFrac = (e.clientX - d.startX) / d.rect.width;
    const dyFrac = (e.clientY - d.startY) / d.rect.height;
    patch(d.key, { x: clamp01(d.start.x + dxFrac), y: clamp01(d.start.y + dyFrac) });
  }

  function onDragEnd() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }

  function beginDrag(e, key) {
    e.preventDefault();
    e.stopPropagation();
    if (!stageRef.current) return;
    dragRef.current = {
      key,
      rect: stageRef.current.getBoundingClientRect(),
      start: { ...layout[key] },
      startX: e.clientX,
      startY: e.clientY,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
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
      {pending && (
        <div className="certlayout__pending">
          <div className="certlayout__pending-info">
            <div className="certlayout__pending-title">Layout suggestion from a member's application</div>
            <p className="formnote">
              An applicant nudged the placeholder positions while filling out the form
              {pending.__proposedAt ? ` on ${new Date(pending.__proposedAt).toLocaleString()}` : ""}. Approve to
              make this the live layout, or discard to keep the current one.
            </p>
            {pendingError && <p className="formnote" style={{ color: "#b3402f" }}>{pendingError}</p>}
            <div className="row2" style={{ marginTop: 8 }}>
              <button className="btn btn--solid" disabled={reviewing} onClick={approvePending}>
                {reviewing ? "Working…" : "Approve as final"}
              </button>
              <button className="btn" disabled={reviewing} onClick={discardPending}>
                Discard
              </button>
            </div>
          </div>
          <div className="certlayout__stage certlayout__stage--pending">
            <CertificateCanvas variant={variant} layout={pending} data={SAMPLE_DATA} />
            <div
              className="certlayout__handle"
              style={{ left: `${pending.membershipNo.x * 100}%`, top: `${pending.membershipNo.y * 100}%` }}
            >
              Membership No.
            </div>
            <div
              className="certlayout__handle"
              style={{ left: `${pending.name.x * 100}%`, top: `${pending.name.y * 100}%` }}
            >
              Name
            </div>
          </div>
        </div>
      )}

      <div className="certlayout__grid">
        <div className="certlayout__fields">
          <p className="formnote">Drag the markers on the preview to reposition, or fine-tune with numbers below.</p>
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
          <div className="certlayout__stage" ref={stageRef}>
            <CertificateCanvas variant={variant} layout={layout} data={SAMPLE_DATA} />

            <div
              className="certlayout__handle"
              style={{ left: `${layout.membershipNo.x * 100}%`, top: `${layout.membershipNo.y * 100}%` }}
              onPointerDown={(e) => beginDrag(e, "membershipNo")}
            >
              Membership No.
            </div>

            <div
              className="certlayout__handle"
              style={{ left: `${layout.name.x * 100}%`, top: `${layout.name.y * 100}%` }}
              onPointerDown={(e) => beginDrag(e, "name")}
            >
              Name
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- generic field editors */
// Reusable across every page's content editor below. `fields` items look
// like { key, label, type: "text"|"number"|"textarea"|"select"|"paragraphs", options?, full? }.
function ListEditor({ items, onChange, fields, addDefault, itemLabel }) {
  function updateItem(i, key, value) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  }
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 14 }}>
          {itemLabel && <p className="formnote" style={{ marginBottom: 8 }}>{itemLabel} {i + 1}</p>}
          <div className="row2">
            {fields.map((f) => (
              <div className="field" key={f.key} style={f.full ? { gridColumn: "1 / -1" } : undefined}>
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select value={item[f.key] || ""} onChange={(e) => updateItem(i, f.key, e.target.value)}>
                    {f.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea rows="3" value={item[f.key] || ""} onChange={(e) => updateItem(i, f.key, e.target.value)} />
                ) : f.type === "paragraphs" ? (
                  <textarea
                    rows="4"
                    value={(item[f.key] || []).join("\n\n")}
                    onChange={(e) =>
                      updateItem(
                        i,
                        f.key,
                        e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={item[f.key] ?? ""}
                    onChange={(e) => updateItem(i, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...items, addDefault()])}>
        + Add {itemLabel ? itemLabel.toLowerCase() : "item"}
      </button>
    </>
  );
}

function ParagraphsField({ label, value, onChange }) {
  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{label}</label>
      <textarea
        rows="4"
        value={(value || []).join("\n\n")}
        onChange={(e) => onChange(e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean))}
      />
      <p className="formnote">Separate paragraphs with a blank line.</p>
    </div>
  );
}

function PageHeaderFields({ value, onChange, withLead = true }) {
  return (
    <fieldset className="mfieldset">
      <legend>Page header</legend>
      <div className="row2">
        <div className="field">
          <label>Breadcrumb label</label>
          <input value={value.crumbLabel || ""} onChange={(e) => onChange({ ...value, crumbLabel: e.target.value })} />
        </div>
        <div className="field">
          <label>Title</label>
          <input value={value.title || ""} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
      </div>
      {withLead && (
        <div className="field">
          <label>Lead text</label>
          <textarea rows="2" value={value.lead || ""} onChange={(e) => onChange({ ...value, lead: e.target.value })} />
        </div>
      )}
    </fieldset>
  );
}

/* ---------------------------------------------------------- page content */
const CONTENT_PAGES = [
  "Home",
  "Aims & Objectives",
  "Governing Council",
  "Members",
  "Membership",
  "Activities",
  "Blog",
  "What's New",
  "Contact",
  "Footer & Navigation",
];

function PageContentEditor() {
  const [content, setContent] = useState(null);
  const [page, setPage] = useState("Home");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSiteContent().then(setContent).catch((e) => setError(e.message));
  }, []);

  function set(key, value) {
    setSaved(false);
    setContent((c) => ({ ...c, [key]: value }));
  }
  function setPageHead(key, value) {
    setSaved(false);
    setContent((c) => ({ ...c, pageHeads: { ...c.pageHeads, [key]: value } }));
  }
  function updateSlide(i, value) {
    setSaved(false);
    setContent((c) => ({ ...c, heroSlides: c.heroSlides.map((s, idx) => (idx === i ? value : s)) }));
  }
  function addSlide() {
    setSaved(false);
    setContent((c) => ({ ...c, heroSlides: [...c.heroSlides, ""] }));
  }
  function removeSlide(i) {
    setSaved(false);
    setContent((c) => ({ ...c, heroSlides: c.heroSlides.filter((_, idx) => idx !== i) }));
  }
  function updateBanner(i, field, value) {
    setSaved(false);
    setContent((c) => ({ ...c, banners: c.banners.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)) }));
  }
  function addBanner() {
    setSaved(false);
    setContent((c) => ({ ...c, banners: [...c.banners, { img: "", title: "", kicker: "" }] }));
  }
  function removeBanner(i) {
    setSaved(false);
    setContent((c) => ({ ...c, banners: c.banners.filter((_, idx) => idx !== i) }));
  }
  function updateContact(field, value) {
    setSaved(false);
    setContent((c) => ({ ...c, contact: { ...c.contact, [field]: value } }));
  }
  function updateOrg(field, value) {
    setSaved(false);
    setContent((c) => ({ ...c, org: { ...c.org, [field]: value } }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.updateSiteContent(content);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!content) return <p className="formnote" style={{ padding: "24px 8px" }}>Loading site content…</p>;

  return (
    <div className="certlayout">
      <div className="seg" style={{ marginBottom: 20, flexWrap: "wrap", rowGap: 8 }}>
        {CONTENT_PAGES.map((p) => (
          <button key={p} className={page === p ? "is-on" : ""} onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="certlayout__fields" style={{ maxWidth: 720 }}>
        {page === "Home" && (
          <>
            <fieldset className="mfieldset">
              <legend>Organisation</legend>
              <div className="row2">
                <div className="field">
                  <label>Name</label>
                  <input value={content.org.name} onChange={(e) => updateOrg("name", e.target.value)} />
                </div>
                <div className="field">
                  <label>Tagline</label>
                  <input value={content.org.tagline} onChange={(e) => updateOrg("tagline", e.target.value)} />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Logo image URL</label>
                  <input value={content.org.logo} onChange={(e) => updateOrg("logo", e.target.value)} />
                </div>
                <div className="field">
                  <label>Founder photo URL</label>
                  <input value={content.org.founder} onChange={(e) => updateOrg("founder", e.target.value)} />
                </div>
              </div>
            </fieldset>

            <fieldset className="mfieldset">
              <legend>Home carousel photos</legend>
              <p className="formnote">Image URLs shown in the homepage hero carousel, in order.</p>
              {content.heroSlides.map((src, i) => (
                <div className="row2" key={i}>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Photo {i + 1}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={src} onChange={(e) => updateSlide(i, e.target.value)} placeholder="/carousel/1.jpeg or https://…" />
                      <button type="button" className="btn btn--ghost" onClick={() => removeSlide(i)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn--ghost" style={{ alignSelf: "flex-start" }} onClick={addSlide}>
                + Add photo
              </button>
            </fieldset>

            <fieldset className="mfieldset">
              <legend>Stats strip</legend>
              <ListEditor
                items={content.stats}
                onChange={(v) => set("stats", v)}
                itemLabel="Stat"
                addDefault={() => ({ value: 0, suffix: "", label: "" })}
                fields={[
                  { key: "value", label: "Value", type: "number" },
                  { key: "suffix", label: "Suffix", type: "text" },
                  { key: "label", label: "Label", type: "text", full: true },
                ]}
              />
            </fieldset>

            <fieldset className="mfieldset">
              <legend>About section</legend>
              <div className="field">
                <label>Title</label>
                <input value={content.homeAbout.title} onChange={(e) => set("homeAbout", { ...content.homeAbout, title: e.target.value })} />
              </div>
              <ParagraphsField
                label="Body"
                value={content.homeAbout.body}
                onChange={(v) => set("homeAbout", { ...content.homeAbout, body: v })}
              />
            </fieldset>

            <fieldset className="mfieldset">
              <legend>Ranganathan's Five Laws</legend>
              <p className="formnote">Also shown on the Aims & Objectives page.</p>
              <ListEditor
                items={content.fiveLaws}
                onChange={(v) => set("fiveLaws", v)}
                itemLabel="Law"
                addDefault={() => ({ n: String(content.fiveLaws.length + 1).padStart(2, "0"), law: "", note: "" })}
                fields={[
                  { key: "n", label: "No.", type: "text" },
                  { key: "law", label: "Law", type: "text", full: true },
                  { key: "note", label: "Note", type: "textarea", full: true },
                ]}
              />
            </fieldset>

            <fieldset className="mfieldset">
              <legend>Objectives grid</legend>
              <ListEditor
                items={content.objectivesShort}
                onChange={(v) => set("objectivesShort", v)}
                itemLabel="Objective"
                addDefault={() => ({ n: String(content.objectivesShort.length + 1).padStart(2, "0"), title: "", body: "" })}
                fields={[
                  { key: "n", label: "No.", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "body", label: "Body", type: "textarea", full: true },
                ]}
              />
            </fieldset>

            <fieldset className="mfieldset">
              <legend>"In the field" banners</legend>
              {content.banners.map((b, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 4 }}>
                  <div className="field">
                    <label>Image URL</label>
                    <input value={b.img} onChange={(e) => updateBanner(i, "img", e.target.value)} placeholder="/banners/photo.jpg or https://…" />
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label>Title</label>
                      <input value={b.title} onChange={(e) => updateBanner(i, "title", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Kicker</label>
                      <input value={b.kicker} onChange={(e) => updateBanner(i, "kicker", e.target.value)} />
                    </div>
                  </div>
                  <button type="button" className="btn btn--ghost" onClick={() => removeBanner(i)}>Remove banner</button>
                </div>
              ))}
              <button type="button" className="btn btn--ghost" style={{ alignSelf: "flex-start" }} onClick={addBanner}>
                + Add banner
              </button>
            </fieldset>
          </>
        )}

        {page === "Aims & Objectives" && (
          <>
            <PageHeaderFields value={content.pageHeads.aimsObjectives} onChange={(v) => setPageHead("aimsObjectives", v)} withLead={false} />
            <fieldset className="mfieldset">
              <legend>Introduction</legend>
              <textarea rows="3" value={content.aims.intro} onChange={(e) => set("aims", { ...content.aims, intro: e.target.value })} />
            </fieldset>
            <fieldset className="mfieldset">
              <legend>Clauses</legend>
              <ListEditor
                items={content.aims.clauses}
                onChange={(v) => set("aims", { ...content.aims, clauses: v })}
                itemLabel="Clause"
                addDefault={() => ({ tag: String.fromCharCode(97 + content.aims.clauses.length), text: "" })}
                fields={[
                  { key: "tag", label: "Tag", type: "text" },
                  { key: "text", label: "Text", type: "textarea", full: true },
                ]}
              />
            </fieldset>
          </>
        )}

        {page === "Governing Council" && (
          <>
            <PageHeaderFields value={content.pageHeads.governingCouncil} onChange={(v) => setPageHead("governingCouncil", v)} />
            <fieldset className="mfieldset">
              <legend>Council members</legend>
              <p className="formnote">Role must be one of the fixed groups below — it controls how members are grouped on the Governing Council page.</p>
              <ListEditor
                items={content.council}
                onChange={(v) => set("council", v)}
                itemLabel="Member"
                addDefault={() => ({ role: COUNCIL_ROLES[COUNCIL_ROLES.length - 1], name: "", img: "", detail: "", email: "", phone: "" })}
                fields={[
                  { key: "role", label: "Role", type: "select", options: COUNCIL_ROLES },
                  { key: "name", label: "Name", type: "text" },
                  { key: "img", label: "Photo URL", type: "text" },
                  { key: "detail", label: "Detail", type: "textarea", full: true },
                  { key: "email", label: "E-mail", type: "text" },
                  { key: "phone", label: "Phone", type: "text" },
                ]}
              />
            </fieldset>
          </>
        )}

        {page === "Members" && <PageHeaderFields value={content.pageHeads.members} onChange={(v) => setPageHead("members", v)} />}

        {page === "Membership" && (
          <>
            <PageHeaderFields value={content.pageHeads.membership} onChange={(v) => setPageHead("membership", v)} withLead={false} />
            <fieldset className="mfieldset">
              <legend>Introduction</legend>
              <textarea rows="3" value={content.membership.intro} onChange={(e) => set("membership", { ...content.membership, intro: e.target.value })} />
            </fieldset>
            <fieldset className="mfieldset">
              <legend>Membership classes</legend>
              <ListEditor
                items={content.membership.classes}
                onChange={(v) => set("membership", { ...content.membership, classes: v })}
                itemLabel="Class"
                addDefault={() => ({ name: "", body: "" })}
                fields={[
                  { key: "name", label: "Name", type: "text", full: true },
                  { key: "body", label: "Body", type: "textarea", full: true },
                ]}
              />
            </fieldset>
          </>
        )}

        {page === "Activities" && (
          <>
            <PageHeaderFields value={content.pageHeads.activities} onChange={(v) => setPageHead("activities", v)} />
            <fieldset className="mfieldset">
              <legend>Schedule</legend>
              <ListEditor
                items={content.activities}
                onChange={(v) => set("activities", v)}
                itemLabel="Event"
                addDefault={() => ({ date: "", day: "", venue: "", speaker: "", time: "", link: "" })}
                fields={[
                  { key: "date", label: "Date (YYYY-MM-DD)", type: "text" },
                  { key: "day", label: "Day", type: "text" },
                  { key: "venue", label: "Venue", type: "textarea", full: true },
                  { key: "speaker", label: "Speaker / coordinator", type: "textarea", full: true },
                  { key: "time", label: "Time", type: "text" },
                  { key: "link", label: "Registration link", type: "text" },
                ]}
              />
            </fieldset>
          </>
        )}

        {page === "Blog" && (
          <>
            <PageHeaderFields value={content.pageHeads.blog} onChange={(v) => setPageHead("blog", v)} />
            <fieldset className="mfieldset">
              <legend>Posts</legend>
              <ListEditor
                items={content.blog}
                onChange={(v) => set("blog", v)}
                itemLabel="Post"
                addDefault={() => ({ slug: "", title: "", excerpt: "", img: "", date: "", body: [] })}
                fields={[
                  { key: "slug", label: "Slug (used in the URL)", type: "text" },
                  { key: "date", label: "Date", type: "text" },
                  { key: "title", label: "Title", type: "text", full: true },
                  { key: "excerpt", label: "Excerpt", type: "textarea", full: true },
                  { key: "img", label: "Image URL", type: "text", full: true },
                  { key: "body", label: "Body", type: "paragraphs", full: true },
                ]}
              />
            </fieldset>
          </>
        )}

        {page === "What's New" && (
          <>
            <PageHeaderFields value={content.pageHeads.whatsNew} onChange={(v) => setPageHead("whatsNew", v)} />
            <p className="formnote">The notices themselves are managed from the "Notices" tab, not here.</p>
          </>
        )}

        {page === "Contact" && (
          <>
            <PageHeaderFields value={content.pageHeads.contact} onChange={(v) => setPageHead("contact", v)} />
            <fieldset className="mfieldset">
              <legend>Contact details</legend>
              <div className="field">
                <label>Phone</label>
                <input value={content.contact.altPhone} onChange={(e) => updateContact("altPhone", e.target.value)} />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input value={content.contact.email} onChange={(e) => updateContact("email", e.target.value)} />
              </div>
              <div className="field">
                <label>Address</label>
                <textarea rows="3" value={content.contact.address} onChange={(e) => updateContact("address", e.target.value)} />
              </div>
            </fieldset>
          </>
        )}

        {page === "Footer & Navigation" && (
          <>
            <fieldset className="mfieldset">
              <legend>Footer</legend>
              <div className="field">
                <label>Blurb</label>
                <textarea rows="3" value={content.footer.blurb} onChange={(e) => set("footer", { ...content.footer, blurb: e.target.value })} />
              </div>
              <div className="field">
                <label>Copyright line (shown after the year)</label>
                <input value={content.footer.copyright} onChange={(e) => set("footer", { ...content.footer, copyright: e.target.value })} />
              </div>
            </fieldset>
            <fieldset className="mfieldset">
              <legend>Navigation labels</legend>
              <p className="formnote">Only the label text is editable — each link's destination is fixed.</p>
              {DEFAULT_NAV_LINKS.map((l, i) => (
                <div className="field" key={l.to}>
                  <label>{l.to}</label>
                  <input
                    value={content.navLabels[i] ?? l.label}
                    onChange={(e) => set("navLabels", content.navLabels.map((v, idx) => (idx === i ? e.target.value : v)))}
                  />
                </div>
              ))}
            </fieldset>
          </>
        )}

        {error && <p className="formnote" style={{ color: "#b3402f" }}>{error}</p>}
        <button className="btn btn--solid" disabled={saving} onClick={save} style={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ notices */
const EMPTY_NOTICE_DRAFT = { title: "", body: "", date: "", image: "", link: "" };

function NoticesEditor() {
  const [notices, setNotices] = useState(null);
  const [draft, setDraft] = useState(EMPTY_NOTICE_DRAFT);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getNotices().then((r) => setNotices(r.notices)).catch((e) => setError(e.message));
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setAdding(true);
    setError("");
    try {
      const created = await api.addNotice(draft);
      setNotices((n) => [created, ...n]);
      setDraft(EMPTY_NOTICE_DRAFT);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setAdding(false);
    }
  }

  async function save(n) {
    setError("");
    try {
      const updated = await api.updateNotice(n.id, { title: n.title, body: n.body, date: n.date, image: n.image, link: n.link });
      setNotices((list) => list.map((x) => (x.id === n.id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this notice?")) return;
    setError("");
    try {
      await api.deleteNotice(id);
      setNotices((list) => list.filter((n) => n.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  function editLocal(id, field, value) {
    setNotices((list) => list.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  }

  if (!notices) return <p className="formnote" style={{ padding: "24px 8px" }}>Loading notices…</p>;

  return (
    <div className="certlayout">
      <div className="certlayout__fields" style={{ maxWidth: 720 }}>
        <fieldset className="mfieldset">
          <legend>Add a notice</legend>
          <p className="formnote">
            Shows in the scrolling notices strip on every page, in the homepage carousel, and in full detail on
            the Notifications page — most recent first.
          </p>
          <form onSubmit={add}>
            <div className="field">
              <label>Title *</label>
              <input required value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="row2">
              <div className="field">
                <label>Date (free text, e.g. "5 March 2026")</label>
                <input value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
              </div>
              <div className="field">
                <label>Image URL (shown on the homepage carousel)</label>
                <input value={draft.image} onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))} placeholder="/carousel/photo.jpg or https://…" />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows="3" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
            </div>
            <div className="field">
              <label>Registration / form link (optional)</label>
              <input value={draft.link} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))} placeholder="https://…" />
            </div>
            <button className="btn btn--solid" disabled={adding} style={{ marginTop: 10 }}>
              {adding ? "Adding…" : "+ Add notice"}
            </button>
          </form>
        </fieldset>

        <fieldset className="mfieldset">
          <legend>Current notices</legend>
          {notices.length === 0 && <p className="formnote">No notices yet.</p>}
          {notices.map((n) => (
            <div key={n.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Title</label>
                <input value={n.title} onChange={(e) => editLocal(n.id, "title", e.target.value)} />
              </div>
              <div className="row2">
                <div className="field">
                  <label>Date</label>
                  <input value={n.date || ""} onChange={(e) => editLocal(n.id, "date", e.target.value)} />
                </div>
                <div className="field">
                  <label>Image URL</label>
                  <input value={n.image || ""} onChange={(e) => editLocal(n.id, "image", e.target.value)} placeholder="/carousel/photo.jpg or https://…" />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows="3" value={n.body || ""} onChange={(e) => editLocal(n.id, "body", e.target.value)} />
              </div>
              <div className="field">
                <label>Registration / form link</label>
                <input value={n.link || ""} onChange={(e) => editLocal(n.id, "link", e.target.value)} placeholder="https://…" />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn--ghost" onClick={() => save(n)}>Save</button>
                <button type="button" className="btn btn--ghost danger" onClick={() => remove(n.id)}>Delete</button>
              </div>
            </div>
          ))}
        </fieldset>

        {error && <p className="formnote" style={{ color: "#b3402f" }}>{error}</p>}
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
function Detail({ m, onClose, onChange, onDelete, notice }) {
  const [showCert, setShowCert] = useState(false);
  const [layout, setLayout] = useState(null);
  const isActive = m.status === "active";
  const isRejected = m.status === "rejected";

  function togglePreview() {
    if (!showCert && !layout) api.getCertificateLayout().then(setLayout).catch(() => {});
    setShowCert((s) => !s);
  }

  function activate() {
    if (isActive) return;
    if (!confirm("Make this membership ACTIVE and email the member their certificate?")) return;
    onChange(m.id, { status: "active" });
  }

  function reject() {
    const reason = prompt("Reason for rejecting this membership application:");
    if (reason == null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      alert("Please enter a rejection reason before rejecting the application.");
      return;
    }
    onChange(m.id, { status: "rejected" }, { rejectionReason: trimmed });
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
          {m.membership_type === "institutional" && (
            <>
              {row("Institution", m.inst_address)}
              {row("Contact person", m.inst_contact_person)}
              {row("Inst. designation", m.inst_designation)}
              {row("Inst. telephone", m.inst_telephone)}
            </>
          )}
          {row("Payment receipt", m.receipt_emailed ? "Emailed to office inbox ✓ — search by name/reference code" : "Not received")}
          {row("Reference code", m.certificate_ref)}
          {row("Membership No.", m.membership_no)}
          {row("Verified date", m.verified_date)}
          {row("Submitted", new Date(m.created_at).toLocaleString())}
          {notice && <p className="review-notice">{notice}</p>}

          {showCert && (
            <div className="drow drow--block">
              <span>Certificate</span>
              <CertificateCanvas variant={m.status === "active" ? "signed" : "draft"} layout={layout} data={m} />
            </div>
          )}
        </div>

        <div className="modal__actions">
          <div className="seg">
            <button className={isActive ? "is-on" : ""} disabled={isActive} onClick={activate}>
              Active
            </button>
            <button className={isRejected ? "is-on" : ""} disabled={isRejected} onClick={reject}>
              {isRejected ? "Rejected" : "Reject"}
            </button>
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
  const [view, setView] = useState("members"); // members | layout | content | notices
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certLayout, setCertLayout] = useState(null);
  const [emailingMember, setEmailingMember] = useState(null);
  const [reviewNotice, setReviewNotice] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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

  async function change(id, patch, options = {}) {
    const prev = members.find((x) => x.id === id) || active;
    const wasActive = prev?.status === "active";
    setReviewNotice("");
    const updated = await api.updateMember(id, patch);
    setMembers((ms) => ms.map((m) => (m.id === id ? updated : m)));
    setActive((a) => (a && a.id === id ? updated : a));
    api.stats().then(setStats).catch(() => {});

    // Approving (pending/rejected -> active) issues the certificate — email
    // it to the member the same way the self-claim flow does.
    if (patch.status === "active" && !wasActive) {
      if (updated.email) {
        setReviewNotice("Membership is active. Sending approval email...");
        if (!certLayout) {
          try {
            setCertLayout(await api.getCertificateLayout());
          } catch {
            /* fall back to the canvas's own default layout */
          }
        }
        setEmailingMember(updated);
      } else {
        setReviewNotice("Membership is active. No email address is available, so no approval email was sent.");
      }
    }

    if (patch.status === "rejected" && options.rejectionReason) {
      if (updated.email) {
        setReviewNotice("Membership is rejected. Sending rejection email...");
        try {
          const res = await api.emailMemberRejection(updated.id, options.rejectionReason);
          setReviewNotice(res.emailed ? "Membership is rejected and the email has been sent." : "Membership is rejected, but email is not configured.");
        } catch (e) {
          setReviewNotice("Membership is rejected, but the rejection email could not be sent.");
          console.error("Could not email rejection notice:", e.message);
        }
      } else {
        setReviewNotice("Membership is rejected. No email address is available, so no rejection email was sent.");
      }
    }
  }

  async function handleApprovalCanvasReady(canvas) {
    if (!emailingMember) return;
    const member = emailingMember;
    setEmailingMember(null);
    try {
      const res = await api.emailMemberCertificate(member.id, canvasToAttachment(canvas));
      setReviewNotice(res.emailed ? "Membership is active and the mail has been sent." : "Membership is active, but email is not configured.");
    } catch (e) {
      setReviewNotice("Membership is active, but the approval email could not be sent.");
      console.error("Could not email approval certificate:", e.message);
    }
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

  async function copyMember(e, m) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatMemberDetails(m));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
    } catch {
      // Clipboard access can fail outside a secure context — not worth
      // surfacing an error for a convenience action like this.
    }
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
            <button className={view === "content" ? "is-on" : ""} onClick={() => setView("content")}>Page content</button>
            <button className={view === "notices" ? "is-on" : ""} onClick={() => setView("notices")}>Notices</button>
          </div>
          {view === "members" && <button className="btn btn--solid" onClick={() => setAdding(true)}>+ Add member</button>}
          <button className="btn btn--ghost" onClick={() => { clearToken(); onOut(); }}>Sign out</button>
        </div>
      </div>

      {view === "layout" ? (
        <CertificateLayout />
      ) : view === "content" ? (
        <PageContentEditor />
      ) : view === "notices" ? (
        <NoticesEditor />
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
          <span>Name</span><span>Type</span><span>Contact</span><span>Status</span><span>Submitted</span><span></span>
        </div>
        <AnimatePresence initial={false}>
          {members.map((m) => (
            <motion.div
              key={m.id}
              className="atable__row"
              role="button"
              tabIndex={0}
              onClick={() => { setActive(m); setReviewNotice(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { setActive(m); setReviewNotice(""); }
              }}
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <span className="atable__name">{m.name}{m.source === "manual" && <em> · added</em>}</span>
              <span>{TYPE_LABEL[m.membership_type]}</span>
              <span className="atable__contact">{m.email || m.mobile || "—"}</span>
              <span><i className={`pill pill--${m.status}`}>{STATUS_LABEL[m.status]}</i></span>
              <span className="atable__date">{new Date(m.created_at).toLocaleDateString()}</span>
              <button type="button" className="btn btn--ghost atable__copy" onClick={(e) => copyMember(e, m)}>
                {copiedId === m.id ? "Copied ✓" : "Copy"}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && members.length === 0 && <p className="formnote" style={{ padding: "24px 8px" }}>No members in this view yet.</p>}
        {loading && <p className="formnote" style={{ padding: "24px 8px" }}>Loading…</p>}
      </div>
      </>
      )}

      {emailingMember && (
        <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
          <CertificateCanvas variant="signed" layout={certLayout} data={emailingMember} onReady={handleApprovalCanvasReady} />
        </div>
      )}

      <AnimatePresence>
        {active && <Detail m={active} onClose={() => setActive(null)} onChange={change} onDelete={remove} notice={reviewNotice} />}
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

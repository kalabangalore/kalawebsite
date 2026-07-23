import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import CertificateCanvas, { downloadCanvas, canvasToAttachment } from "../components/CertificateCanvas";

const TYPES = [
  { value: "life", label: "Life" },
  { value: "institutional", label: "Institutional" },
  { value: "student", label: "Student" },
];

// Searchable name picker — a plain <select> would be unwieldy for 1,500+
// names, so this is a small custom combobox: type to filter, click to pick.
function NamePicker({ onPick }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!q.trim()) {
      setMatches([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api
        .listLegacyMembers({ q, limit: 8 })
        .then((res) => {
          if (alive) setMatches(res.members);
        })
        .catch(() => {});
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="namepicker" ref={boxRef}>
      <label className="search">
        <span className="ic">⌕</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Start typing your name…"
          aria-label="Search your name"
        />
      </label>
      {open && matches.length > 0 && (
        <div className="namepicker__list">
          {matches.map((m) => (
            <button
              type="button"
              key={m.id}
              className="namepicker__item"
              onClick={() => {
                setQ(m.name);
                setOpen(false);
                onPick(m);
              }}
            >
              <span>{m.name}</span>
              {m.claimed && <span className="dirrow__claimed">Claimed</span>}
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && matches.length === 0 && (
        <div className="namepicker__list">
          <div className="namepicker__empty">No names match “{q}”.</div>
        </div>
      )}
    </div>
  );
}

export default function LegacyMemberAccess() {
  const [step, setStep] = useState("pick"); // pick | setup | pin-login | result
  const [entry, setEntry] = useState(null); // { id, name, has_pin, claimed }
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [details, setDetails] = useState({ email: "", mobile: "", date_of_birth: "", designation: "", membership_type: "life" });
  const [member, setMember] = useState(null);
  const [layout, setLayout] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [emailStatus, setEmailStatus] = useState(""); // "", "sending", "sent", "failed"
  const emailedRef = useRef(false);
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    api.getCertificateLayout().then(setLayout).catch(() => {});
  }, []);

  async function pick(m) {
    setErr("");
    setBusy(true);
    try {
      const status = await api.getLegacyMember(m.id);
      setEntry(status);
      setStep(status.has_pin ? "pin-login" : "setup");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitSetup(e) {
    e.preventDefault();
    if (pin.length < 4) return setErr("PIN must be 4-6 digits.");
    if (pin !== pinConfirm) return setErr("PINs don't match.");
    setBusy(true);
    setErr("");
    try {
      try {
        await api.setLegacyPin(entry.id, pin);
      } catch (pinErr) {
        // 409 = a PIN was already set on a previous attempt where the claim
        // step then failed (e.g. bad email) — safe to continue with it.
        if (pinErr.status !== 409) throw pinErr;
      }
      const res = await api.claimLegacyMember(entry.id, details);
      setMember(res.member);
      setStep("result");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await api.loginLegacyMember(entry.id, pin);
      if (res.claimed) {
        setMember(res.member);
        setStep("result");
      } else {
        // PIN was set previously but the details step never completed.
        setStep("setup");
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCanvasReady(canvas) {
    if (emailedRef.current) return;
    emailedRef.current = true;
    setEmailStatus("sending");
    try {
      const res = await api.emailLegacyCertificate(entry.id, canvasToAttachment(canvas));
      setEmailStatus(res.emailed ? "sent" : "failed");
    } catch {
      setEmailStatus("failed");
    }
  }

  async function resend() {
    if (!canvasWrapRef.current) return;
    const canvas = canvasWrapRef.current.querySelector("canvas");
    if (!canvas) return;
    setEmailStatus("sending");
    try {
      const res = await api.emailLegacyCertificate(entry.id, canvasToAttachment(canvas));
      setEmailStatus(res.emailed ? "sent" : "failed");
    } catch {
      setEmailStatus("failed");
    }
  }

  const d = (k) => (e) => setDetails((p) => ({ ...p, [k]: e.target.value }));

  const previewData = entry && {
    name: entry.name,
    membership_type: details.membership_type,
    membership_no: "(shown once you finish)",
    verified_date: new Date().toISOString().slice(0, 10),
  };

  function Preview() {
    if (!previewData) return null;
    return (
      <div className="mform-live" style={{ marginBottom: 24 }}>
        <span className="tag">Certificate preview</span>
        <div style={{ marginTop: 12 }}>
          <CertificateCanvas variant="draft" layout={layout} data={previewData} />
        </div>
      </div>
    );
  }

  if (step === "result" && member) {
    return (
      <div className="notice" style={{ textAlign: "left" }}>
        <span className="tag">Certificate ready</span>
        <h3 style={{ marginTop: 8 }}>Welcome back, {member.name.split(" ")[0]}.</h3>
        <div style={{ marginTop: 16, maxWidth: 640 }} ref={canvasWrapRef}>
          <CertificateCanvas variant="signed" layout={layout} data={member} onReady={handleCanvasReady} />
        </div>
        <p className="certref" style={{ marginTop: 16 }}>
          Your reference code: <b>{member.certificate_ref}</b>
          <br />
          {emailStatus === "sending" && "Emailing your certificate…"}
          {emailStatus === "sent" && `Certificate emailed to ${member.email}.`}
          {emailStatus === "failed" && "Couldn't email the certificate — you can still download it below, or try resending."}
        </p>
        <div className="sign" style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => downloadCanvas(canvasWrapRef.current, `${member.name}-certificate.png`)}
          >
            Download certificate
          </button>
          <button type="button" className="btn btn--ghost" onClick={resend} disabled={emailStatus === "sending"}>
            Resend by email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: entry ? 640 : 520 }}>
      {step === "pick" && (
        <div className="cform">
          <p className="formnote">Find your name on the roster to log in.</p>
          <NamePicker onPick={pick} />
        </div>
      )}

      {step !== "pick" && <Preview />}

      {step === "setup" && entry && (
        <form className="cform" onSubmit={submitSetup}>
          <p className="formnote">
            Hi {entry.name.split(" ")[0]} — we don't have your contact details yet. Set a PIN
            (to log back in later) and fill these in; your certificate is issued and emailed to
            you as soon as you submit.
          </p>
          <div className="row2">
            <div className="field">
              <label>Choose a PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="field">
              <label>Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>E-mail *</label>
              <input type="email" required value={details.email} onChange={d("email")} placeholder="you@email.com" />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={details.mobile} onChange={d("mobile")} placeholder="+91…" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Date of birth</label>
              <input type="date" value={details.date_of_birth} onChange={d("date_of_birth")} />
            </div>
            <div className="field">
              <label>Designation</label>
              <input value={details.designation} onChange={d("designation")} placeholder="e.g. Librarian" />
            </div>
          </div>
          <div className="field">
            <label>Membership type</label>
            <select value={details.membership_type} onChange={d("membership_type")}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {err && <p className="formnote" style={{ color: "#b3402f" }}>{err}</p>}
          <div className="sign" style={{ display: "flex", gap: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep("pick")} disabled={busy}>
              ← Not you?
            </button>
            <button type="submit" className="btn btn--solid" disabled={busy}>
              {busy ? "Submitting…" : "Get my certificate →"}
            </button>
          </div>
        </form>
      )}

      {step === "pin-login" && entry && (
        <form className="cform" onSubmit={submitLogin}>
          <p className="formnote">Welcome back, {entry.name.split(" ")[0]}. Enter your PIN.</p>
          <div className="field">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          {err && <p className="formnote" style={{ color: "#b3402f" }}>{err}</p>}
          <div className="sign" style={{ display: "flex", gap: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep("pick")} disabled={busy}>
              ← Not you?
            </button>
            <button type="submit" className="btn btn--solid" disabled={busy}>
              {busy ? "Checking…" : "Log in →"}
            </button>
          </div>
        </form>
      )}

      {err && step === "pick" && <p className="formnote" style={{ color: "#b3402f", marginTop: 10 }}>{err}</p>}
    </div>
  );
}

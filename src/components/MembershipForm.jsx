import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import CertificateCanvas from "./CertificateCanvas";

const TYPES = [
  { value: "life", label: "Life", fee: "₹300 / annum" },
  { value: "institutional", label: "Institutional", fee: "₹500 / annum" },
  { value: "student", label: "Student", fee: "Certified by Institution" },
];

const empty = {
  membership_type: "life",
  name: "",
  designation: "",
  office_address: "",
  office_pin: "",
  office_telephone: "",
  mobile: "",
  residence_address: "",
  residence_pin: "",
  email: "",
  date_of_birth: "",
  qual_academic: "",
  qual_professional: "",
  qual_others: "",
  inst_address: "",
  inst_contact_person: "",
  inst_designation: "",
  inst_telephone: "",
};

function Field({ label, children, full }) {
  return (
    <div className="field" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function MembershipForm() {
  const [f, setF] = useState(empty);
  const [state, setState] = useState("idle"); // idle | preview | sending | done | error
  const [err, setErr] = useState("");
  const [certRef, setCertRef] = useState("");
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    api.getCertificateLayout().then(setLayout).catch(() => {});
  }, []);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  function goToPreview(e) {
    e.preventDefault();
    setState("preview");
    window.scrollTo({ top: document.getElementById("apply").offsetTop - 80, behavior: "smooth" });
  }

  async function submit() {
    setState("sending");
    setErr("");
    try {
      const res = await api.submitMembership(f);
      setCertRef(res.certificate_ref || "");
      setState("done");
    } catch (e2) {
      setErr(e2.message);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <motion.div
        className="notice"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center" }}
      >
        <span className="tag">Application received</span>
        <h3>Thank you, {f.name.split(" ")[0] || "friend"}.</h3>
        <p style={{ maxWidth: "52ch", margin: "8px auto 0" }}>
          Your membership application has been submitted to the Karnataka State Library Association.
          The office will review it and get in touch about the enrolment fee and next steps.
        </p>
        {certRef && (
          <p className="certref" style={{ marginTop: 16 }}>
            Your reference code: <b>{certRef}</b>
            <br />
            Save this — use it on the{" "}
            <a href="/certificate">certificate lookup page</a> to check your status and view your
            certificate once approved.
          </p>
        )}
        <div className="sign" style={{ marginTop: 20 }}>
          <button
            className="btn btn--ghost"
            onClick={() => {
              setF(empty);
              setCertRef("");
              setState("idle");
            }}
          >
            Submit another application
          </button>
        </div>
      </motion.div>
    );
  }

  if (state === "preview" || state === "sending" || state === "error") {
    return (
      <motion.div className="certpreview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="tag">Preview your certificate</span>
        <h3 style={{ marginTop: 10 }}>Does this look right?</h3>
        <p style={{ maxWidth: "58ch", margin: "8px 0 20px" }}>
          This is how your certificate will look once the office reviews and approves your
          application (membership number and verification date are assigned at that point).
        </p>
        <CertificateCanvas
          variant="draft"
          layout={layout}
          data={{
            name: f.name,
            membership_type: f.membership_type,
            membership_no: "(assigned on approval)",
            verified_date: new Date().toISOString().slice(0, 10),
          }}
        />
        {err && <p className="formnote" style={{ color: "#b3402f", marginTop: 14 }}>{err}</p>}
        <div className="sign" style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setErr("");
              setState("idle");
            }}
          >
            ← Edit details
          </button>
          <button
            type="button"
            className="btn btn--solid"
            disabled={state === "sending"}
            onClick={submit}
          >
            {state === "sending" ? "Submitting…" : "Confirm & submit application →"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <form className="cform mform" onSubmit={goToPreview}>
      {/* Membership type */}
      <fieldset className="mfieldset">
        <legend>Membership type</legend>
        <div className="typepick">
          {TYPES.map((t) => (
            <label key={t.value} className={`typecard ${f.membership_type === t.value ? "is-sel" : ""}`}>
              <input
                type="radio"
                name="mtype"
                value={t.value}
                checked={f.membership_type === t.value}
                onChange={set("membership_type")}
              />
              <span className="typecard__label">{t.label}</span>
              <span className="typecard__fee">{t.fee}</span>
            </label>
          ))}
        </div>
        <p className="formnote">Enrolment fee of ₹10 is common to all membership types.</p>
      </fieldset>

      {/* Personal */}
      <fieldset className="mfieldset">
        <legend>Applicant details</legend>
        <div className="row2">
          <Field label="Name *">
            <input value={f.name} onChange={set("name")} required placeholder="Full name" />
          </Field>
          <Field label="Designation">
            <input value={f.designation} onChange={set("designation")} placeholder="e.g. Librarian" />
          </Field>
        </div>
        <div className="row2">
          <Field label="Date of birth">
            <input type="date" value={f.date_of_birth} onChange={set("date_of_birth")} />
          </Field>
          <Field label="Mobile">
            <input value={f.mobile} onChange={set("mobile")} placeholder="+91…" />
          </Field>
        </div>
      </fieldset>

      {/* Office address */}
      <fieldset className="mfieldset">
        <legend>Office address</legend>
        <Field label="Address" full>
          <textarea rows="2" value={f.office_address} onChange={set("office_address")} />
        </Field>
        <div className="row2">
          <Field label="Pin">
            <input value={f.office_pin} onChange={set("office_pin")} />
          </Field>
          <Field label="Telephone">
            <input value={f.office_telephone} onChange={set("office_telephone")} />
          </Field>
        </div>
      </fieldset>

      {/* Residence */}
      <fieldset className="mfieldset">
        <legend>Residence</legend>
        <Field label="Address" full>
          <textarea rows="2" value={f.residence_address} onChange={set("residence_address")} />
        </Field>
        <div className="row2">
          <Field label="Pin">
            <input value={f.residence_pin} onChange={set("residence_pin")} />
          </Field>
          <Field label="E-mail">
            <input type="email" value={f.email} onChange={set("email")} placeholder="you@email.com" />
          </Field>
        </div>
      </fieldset>

      {/* Qualification */}
      <fieldset className="mfieldset">
        <legend>Qualification</legend>
        <div className="row2">
          <Field label="Academic">
            <input value={f.qual_academic} onChange={set("qual_academic")} />
          </Field>
          <Field label="Professional">
            <input value={f.qual_professional} onChange={set("qual_professional")} />
          </Field>
        </div>
        <Field label="Others" full>
          <input value={f.qual_others} onChange={set("qual_others")} />
        </Field>
      </fieldset>

      {/* Institutional fields */}
      <AnimatePresence>
        {f.membership_type === "institutional" && (
          <motion.fieldset
            className="mfieldset"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <legend>For institutional membership</legend>
            <Field label="Address of the institution" full>
              <textarea rows="2" value={f.inst_address} onChange={set("inst_address")} />
            </Field>
            <div className="row2">
              <Field label="Contact person">
                <input value={f.inst_contact_person} onChange={set("inst_contact_person")} />
              </Field>
              <Field label="Designation">
                <input value={f.inst_designation} onChange={set("inst_designation")} />
              </Field>
            </div>
            <Field label="Telephone / Fax" full>
              <input value={f.inst_telephone} onChange={set("inst_telephone")} />
            </Field>
          </motion.fieldset>
        )}
      </AnimatePresence>

      {err && <p className="formnote" style={{ color: "#b3402f" }}>{err}</p>}

      <button type="submit" className="btn btn--solid" style={{ alignSelf: "flex-start" }}>
        Preview certificate →
      </button>
      <p className="formnote">
        Cheque / DD payable to “Karnataka State Library Association”. The office will confirm payment
        details after reviewing your application.
      </p>
    </form>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import CertificateCanvas, { canvasToAttachment } from "./CertificateCanvas";

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

// Certificate preview with draggable "Membership No." / "Name" markers —
// dragging only ever adjusts local state (see beginDrag in the parent);
// it's proposed to the office for review on submit, never applied live.
function DraggableCert({ variant, layout, data, onDrag, stageRef }) {
  return (
    <div className="certlayout__stage" ref={stageRef}>
      <CertificateCanvas variant={variant} layout={layout} data={data} />
      {layout && (
        <>
          <div
            className="certlayout__handle"
            style={{ left: `${layout.membershipNo.x * 100}%`, top: `${layout.membershipNo.y * 100}%` }}
            onPointerDown={(e) => onDrag(e, "membershipNo")}
          >
            Membership No.
          </div>
          <div
            className="certlayout__handle"
            style={{ left: `${layout.name.x * 100}%`, top: `${layout.name.y * 100}%` }}
            onPointerDown={(e) => onDrag(e, "name")}
          >
            Name
          </div>
        </>
      )}
    </div>
  );
}

const MAX_RECEIPT_BYTES = 1024 * 1024;

export default function MembershipForm() {
  const [f, setF] = useState(empty);
  const [state, setState] = useState("idle"); // idle | sending | done
  const [err, setErr] = useState("");
  const [certRef, setCertRef] = useState("");
  const [layout, setLayout] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptName, setReceiptName] = useState("");
  const [receiptErr, setReceiptErr] = useState("");
  const [layoutOverride, setLayoutOverride] = useState(null);
  const certWrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    api.getCertificateLayout().then(setLayout).catch(() => {});
  }, []);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const previewData = {
    name: f.name,
    membership_type: f.membership_type,
    membership_no: "(assigned on approval)",
    verified_date: new Date().toISOString().slice(0, 10),
  };
  const effectiveLayout = layoutOverride || layout;

  function onDragMove(e) {
    const d = dragRef.current;
    if (!d || !layout) return;
    const dxFrac = (e.clientX - d.startX) / d.rect.width;
    const dyFrac = (e.clientY - d.startY) / d.rect.height;
    setLayoutOverride((prev) => {
      const base = prev || layout;
      return {
        ...base,
        [d.key]: {
          ...base[d.key],
          x: Math.min(1, Math.max(0, d.start.x + dxFrac)),
          y: Math.min(1, Math.max(0, d.start.y + dyFrac)),
        },
      };
    });
  }

  function onDragEnd() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }

  function beginDrag(e, key) {
    e.preventDefault();
    e.stopPropagation();
    const stage = e.currentTarget.closest(".certlayout__stage");
    if (!stage || !layout) return;
    const base = layoutOverride || layout;
    dragRef.current = {
      key,
      rect: stage.getBoundingClientRect(),
      start: { ...base[key] },
      startX: e.clientX,
      startY: e.clientY,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }

  function onReceiptChange(e) {
    const file = e.target.files?.[0];
    setReceiptErr("");
    setReceipt(null);
    setReceiptName("");
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setReceiptErr("Please upload an image or PDF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceiptErr("File must be 1 MB or smaller.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceipt({ fileBase64: reader.result.split(",")[1], mimeType: file.type, fileName: file.name });
      setReceiptName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    if (!receipt) {
      setReceiptErr("Please attach your payment receipt to continue.");
      return;
    }
    setState("sending");
    setErr("");
    try {
      if (layoutOverride) {
        api.proposeCertificateLayout(layoutOverride).catch(() => {});
      }
      const canvas = certWrapRef.current?.querySelector("canvas");
      const certificatePreview = canvas ? canvasToAttachment(canvas) : null;
      const res = await api.submitMembership({ ...f, receipt, certificatePreview });
      setCertRef(res.certificate_ref || "");
      setState("done");
    } catch (e2) {
      setErr(e2.message);
      setState("idle");
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
              setReceipt(null);
              setReceiptName("");
              setLayoutOverride(null);
              setState("idle");
            }}
          >
            Submit another application
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <form className="cform mform" onSubmit={submit}>
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

      {/* Payment */}
      <fieldset className="mfieldset">
        <legend>Payment</legend>
        <div className="paydetails">
          <div>
            <div className="paydetails__label">Bank details</div>
            <p>
              <b>Account name:</b> Karnataka State Library Association
              <br />
              <b>Bank:</b> Canara Bank, Vijayanagar Branch
              <br />
              <b>A/c No.:</b> 1146101024883
              <br />
              <b>IFSC:</b> CNRB0001146
            </p>
            <p className="formnote">OR scan the QR code and pay via GPay / PhonePe / Paytm.</p>
          </div>
          <img className="paydetails__qr" src="/payment-qr.png" alt="Scan to pay via UPI" />
        </div>

        <Field label="Payment receipt (GPay / PhonePe / Paytm) *" full>
          <input type="file" accept="image/*,.pdf" onChange={onReceiptChange} />
          <p className="formnote">Upload 1 file: PDF or image. Max 1 MB.</p>
          {receiptName && <p className="formnote" style={{ color: "var(--brass-soft)" }}>Attached: {receiptName}</p>}
          {receiptErr && <p className="formnote" style={{ color: "#b3402f" }}>{receiptErr}</p>}
        </Field>
      </fieldset>

      {/* Certificate live preview */}
      <div className="mform-live">
        <span className="tag">Live preview</span>
        <DraggableCert variant="draft" layout={effectiveLayout} data={previewData} onDrag={beginDrag} stageRef={certWrapRef} />
        <p className="formnote" style={{ marginTop: 10 }}>
          Updates as you fill in your name and membership type. Drag "Membership No." or "Name" for
          minor position adjustments — sent to the office for review, never applied automatically.
          Membership number and verification date are assigned once the office approves your application.
        </p>
      </div>

      {err && <p className="formnote" style={{ color: "#b3402f" }}>{err}</p>}

      <button type="submit" className="btn btn--solid" disabled={state === "sending"} style={{ alignSelf: "flex-start" }}>
        {state === "sending" ? "Submitting…" : "Submit for membership →"}
      </button>
    </form>
  );
}

import { useRef, useState } from "react";
import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { api } from "../lib/api";
import CertificateCanvas, { downloadCanvas } from "../components/CertificateCanvas";

const STATUS_NOTE = {
  pending: "Your application is still under review by the office. Check back after it's approved.",
  rejected: "This application was not approved. Contact the office if you believe this is a mistake.",
};

export default function Certificate() {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState(null);
  const [layout, setLayout] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [err, setErr] = useState("");
  const canvasWrapRef = useRef(null);

  async function find(e) {
    e.preventDefault();
    setState("loading");
    setErr("");
    setResult(null);
    try {
      const [data, l] = await Promise.all([
        api.lookupCertificate(ref.trim()),
        layout ? Promise.resolve(layout) : api.getCertificateLayout(),
      ]);
      setLayout(l);
      setResult(data);
      setState("done");
    } catch (e2) {
      setErr(e2.message);
      setState("error");
    }
  }

  return (
    <>
      <PageHead
        crumb={<span>Certificate</span>}
        title="Find your certificate"
        lead="Enter the reference code you were given when you applied for membership."
      />

      <section className="section paper-bg">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <form className="cform" onSubmit={find} style={{ flexDirection: "row", gap: 12, alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="ref">Reference code</label>
                <input
                  id="ref"
                  required
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="KALA-XXXXXXXX"
                />
              </div>
              <button className="btn btn--solid" disabled={state === "loading"}>
                {state === "loading" ? "Looking…" : "Find →"}
              </button>
            </form>

            {err && <p className="formnote" style={{ color: "#b3402f", marginTop: 16 }}>{err}</p>}

            {result && result.status !== "active" && (
              <p className="formnote" style={{ marginTop: 20 }}>
                {STATUS_NOTE[result.status] || "No further status is available for this reference."}
              </p>
            )}

            {result && result.status === "active" && (
              <div style={{ marginTop: 28 }} ref={canvasWrapRef}>
                <CertificateCanvas variant="signed" layout={layout} data={result} />
                <div className="sign" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => downloadCanvas(canvasWrapRef.current, `${result.name}-certificate.png`)}
                  >
                    Download certificate
                  </button>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}

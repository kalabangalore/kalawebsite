import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Reveal, Stagger, stagItem } from "../components/primitives";
import { membership } from "../data/content";
import MembershipForm from "../components/MembershipForm";

export default function Membership() {
  return (
    <>
      <PageHead
        crumb={<span>Membership</span>}
        title="Join the Association"
        lead={membership.intro}
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Five classes</span>
            <h2 className="section-title">Find the membership that fits you.</h2>
          </Reveal>

          <Stagger className="mt-l" gap={0.07}>
            {membership.classes.map((c, i) => (
              <motion.div
                className="law"
                variants={stagItem}
                key={c.name}
                style={{ borderColor: "var(--line-dark)", gridTemplateColumns: "110px 1fr" }}
              >
                <div className="law__n" style={{ color: "#9a6a28" }}>{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="law__law" style={{ color: "var(--text-dark)", fontSize: "clamp(22px,2.8vw,32px)" }}>
                    {c.name}
                  </div>
                  <div className="law__note" style={{ color: "var(--muted-dark)" }}>{c.body}</div>
                </div>
              </motion.div>
            ))}
          </Stagger>

          <Reveal>
            <div className="center mt-l">
              <a href="#apply" className="btn btn--solid">Fill the membership form →</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="apply" style={{ background: "var(--ink)" }}>
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Membership form</span>
            <h2 className="section-title" style={{ color: "var(--text)" }}>
              Apply to join KALA.
            </h2>
            <p className="lead" style={{ marginTop: 18, marginBottom: 44 }}>
              Complete the form below — the same details as the printed membership form. Your
              application is saved securely and reviewed by the office.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <MembershipForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}

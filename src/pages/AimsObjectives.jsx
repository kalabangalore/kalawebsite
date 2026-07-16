import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Reveal, Stagger, stagItem } from "../components/primitives";
import { aims, fiveLaws } from "../data/content";

export default function AimsObjectives() {
  return (
    <>
      <PageHead
        crumb={<span>Aims & Objectives</span>}
        title="Aims & Objectives"
        lead={aims.intro}
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">The constitution</span>
            <h2 className="section-title">What the Association sets out to do.</h2>
          </Reveal>

          <Stagger className="mt-l" gap={0.06}>
            {aims.clauses.map((c) => (
              <motion.div className="law" variants={stagItem} key={c.tag} style={{ borderColor: "var(--line-dark)" }}>
                <div className="law__n" style={{ color: "#9a6a28" }}>({c.tag})</div>
                <div>
                  <div className="law__law" style={{ color: "var(--text-dark)", fontSize: "clamp(20px,2.6vw,28px)" }}>
                    {c.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section laws">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Rooted in</span>
            <h2 className="section-title" style={{ color: "var(--text)" }}>
              The Five Laws we work by.
            </h2>
          </Reveal>
          <Stagger className="laws__list mt-l">
            {fiveLaws.map((l) => (
              <motion.div className="law" variants={stagItem} key={l.n}>
                <div className="law__n">{l.n}</div>
                <div>
                  <div className="law__law">{l.law}</div>
                  <div className="law__note">{l.note}</div>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}

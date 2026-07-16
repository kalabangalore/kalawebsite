import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Reveal, Stagger, stagItem } from "../components/primitives";
import { activities } from "../data/activities";

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return { day: iso, mon: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleString("en-US", { month: "short" }),
  };
}

const hasLink = (l) => l && /^https?:\/\//.test(l) && !/x{4,}/i.test(l);

export default function Activities() {
  return (
    <>
      <PageHead
        crumb={<span>Activities</span>}
        title="National Library Week 2025"
        lead="A week of talks, field meets and partner sessions hosted across Karnataka's universities, colleges and research centres."
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">The schedule</span>
            <h2 className="section-title">Eight events. One week. Across the state.</h2>
          </Reveal>

          <Stagger className="tt mt-l" gap={0.06}>
            {activities.map((a, i) => {
              const { day, mon } = fmtDate(a.date);
              return (
                <motion.div className="ttrow" variants={stagItem} key={i}>
                  <div className="ttrow__date">
                    <div className="d">{day} {mon}</div>
                    <div className="day">{a.day}</div>
                  </div>
                  <div className="ttrow__venue">
                    {a.venue}
                    {a.speaker && <small>{a.speaker}</small>}
                  </div>
                  <div className="ttrow__time">{a.time}</div>
                  <div>
                    {hasLink(a.link) ? (
                      <a className="btn btn--solid" href={a.link} target="_blank" rel="noreferrer">
                        Register
                      </a>
                    ) : (
                      <span className="btn btn--ghost" style={{ opacity: 0.5, pointerEvents: "none" }}>
                        Soon
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </Stagger>
        </div>
      </section>
    </>
  );
}

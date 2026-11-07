import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Reveal, Stagger, stagItem } from "../components/primitives";

const GENERAL_RULES = [
  {
    n: "01",
    title: "Submission deadline",
    note: "All reels must be submitted on or before November 13, 2026.",
  },
  {
    n: "02",
    title: "Duration",
    note: "The reel must be strictly under 120 seconds (2 minutes) in length.",
  },
  {
    n: "03",
    title: "Single entry",
    note: "Only one reel per participant is allowed. Make it your best work!",
  },
  {
    n: "04",
    title: "Format",
    note: "Video should be shot in vertical/portrait mode (9:16 aspect ratio), suitable for social media platforms.",
  },
  {
    n: "05",
    title: "Originality",
    note:
      "The content must be entirely original. Any background music used must be royalty-free or properly credited to avoid copyright infringement.",
  },
];

const CATEGORIES = [
  {
    tag: "For working librarians",
    location: "The reel must be shot entirely within the premises of your working library.",
    ideas:
      "Showcase your library services, highlight subscribed resources (like IEEE Xplore, journals, or rare books), demonstrate how you promote these resources, or capture authentic interactions with end-users and library staff.",
  },
  {
    tag: "For library science students",
    location:
      "The reel must be shot within the premises of your university library or your Library Science Department.",
    ideas:
      "Highlight your learning environment, showcase a “day in the life” of a library student, review department resources, or interview faculty/librarians about the future of library sciences.",
  },
];

export default function ReelContestTerms() {
  return (
    <>
      <PageHead
        crumb={<span>Reel Contest</span>}
        title="Lights, Camera, Library!"
        lead="KALA & IEEE present the 2026 Library Reel Contest — terms and guidelines for reel preparation."
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">General rules</span>
            <h2 className="section-title">To ensure a fair and high-quality competition.</h2>
          </Reveal>

          <Stagger className="mt-l" gap={0.06}>
            {GENERAL_RULES.map((r) => (
              <motion.div className="law" variants={stagItem} key={r.n} style={{ borderColor: "var(--line-dark)" }}>
                <div className="law__n" style={{ color: "#9a6a28" }}>{r.n}</div>
                <div>
                  <div className="law__law" style={{ color: "var(--text-dark)", fontSize: "clamp(22px,2.8vw,32px)" }}>
                    {r.title}
                  </div>
                  <div className="law__note" style={{ color: "var(--muted-dark)" }}>{r.note}</div>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section" style={{ background: "var(--ink)" }}>
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Category-specific themes & location rules</span>
            <h2 className="section-title" style={{ color: "var(--text)" }}>
              Pick the track that matches you.
            </h2>
          </Reveal>

          <div
            className="mt-l"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}
          >
            {CATEGORIES.map((c) => (
              <div className="notice" key={c.tag}>
                <span className="tag">{c.tag}</span>
                <p style={{ marginTop: 14 }}>
                  <b>Location constraint:</b> {c.location}
                </p>
                <p>
                  <b>Theme ideas:</b> {c.ideas}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

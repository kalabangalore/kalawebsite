import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Reveal, Stagger, stagItem, Counter } from "../components/primitives";
import { org, banners, stats, fiveLaws, homeAbout, objectivesShort } from "../data/content";
import { council } from "../data/council";

const officers = council.filter((c) => c.role !== "Governing Members");

// Founder portrait that swaps to a video on click, and back again.
function FounderMedia() {
  const [playing, setPlaying] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {playing ? (
        <motion.div
          key="video"
          className="founder-video"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <video
            src="/founder-video.mp4"
            poster={org.founder}
            controls
            autoPlay
            playsInline
            onEnded={() => setPlaying(false)}
          />
          <span className="frame" />
          <button className="founder-back" onClick={() => setPlaying(false)}>
            ← Back to photo
          </button>
        </motion.div>
      ) : (
        <motion.button
          key="photo"
          type="button"
          className="founder-photo"
          onClick={() => setPlaying(true)}
          aria-label="Play the film about Dr. S. R. Ranganathan"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <img src={org.founder} alt="Dr. S. R. Ranganathan" />
          <span className="founder-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
          <span className="frame" />
          <span className="plate">
            <span className="plate__name">Dr. S. R. Ranganathan</span>
            <span className="plate__role">Father of Library Science, India</span>
            <span className="plate__sub">Founder of Karnataka State Library Association</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  const tick = ["Founded by Dr. S. R. Ranganathan", "Registered Association", "1500+ Members", "Since the Mysore State Library Association"];

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__bg" style={{ y, scale }}>
        <img src={banners[1].img} alt="" />
      </motion.div>
      <div className="hero__grain" />

      <div className="hero__inner wrap">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Karnataka State Library Association
        </motion.span>

        <h1>
          {["The science", "of the library,", <em key="e">kept alive.</em>].map((line, i) => (
            <motion.span
              key={i}
              style={{ display: "block" }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.12 }}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="hero__sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          A registered professional body advancing library and information science across Karnataka —
          carrying forward the work begun by the Father of Library Science in India.
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          <Link to="/membership" className="btn btn--solid">Become a member →</Link>
          <Link to="/aims-objectives" className="btn btn--ghost">Our aims</Link>
        </motion.div>
      </div>

      <div className="hero__ticker">
        <motion.div
          className="hero__ticker-track"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        >
          {[0, 1].map((dup) => (
            <span key={dup}>
              {tick.map((t, i) => (
                <span key={i}>
                  <b>✦</b> {t}
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />

      {/* Stats */}
      <section style={{ background: "var(--ink)" }}>
        <div className="wrap">
          <div className="stats">
            {stats.map((s) => (
              <Reveal key={s.label} className="stat">
                <Counter to={s.value} suffix={s.suffix} />
                <div className="stat__label">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About — split with founder portrait */}
      <section className="section paper-bg">
        <div className="wrap split">
          <Reveal>
            <span className="eyebrow">Who we are</span>
            <h2 className="section-title">{homeAbout.title}</h2>
            <div className="prose">
              {homeAbout.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Link to="/aims-objectives" className="btn btn--ghost mt-l">Read our aims & objectives</Link>
          </Reveal>
          <Reveal delay={0.1} className="split__media">
            <FounderMedia />
          </Reveal>
        </div>
      </section>

      {/* Five Laws — signature */}
      <section className="section laws">
        <div className="wrap">
          <div className="laws__head">
            <div>
              <span className="eyebrow">The intellectual spine</span>
              <h2 className="section-title" style={{ color: "var(--text)" }}>
                Ranganathan's Five Laws of Library Science
              </h2>
            </div>
            <p className="lead" style={{ maxWidth: "34ch" }}>
              Formulated in 1931, they still set the standard for every collection we keep.
            </p>
          </div>
          <Stagger className="laws__list">
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

      {/* Objectives grid */}
      <section className="section paper-bg">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">What we do</span>
            <h2 className="section-title">Six commitments that guide the work.</h2>
          </Reveal>
          <Stagger className="objgrid mt-l">
            {objectivesShort.map((o) => (
              <motion.div className="obj" variants={stagItem} key={o.n}>
                <div className="obj__n">{o.n}</div>
                <h4>{o.title}</h4>
                <p>{o.body}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Council preview */}
      <section className="section paper-bg" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="rolehead">
              <h3>Office bearers</h3>
              <span className="rule" />
              <span className="count">{officers.length} members · 2024–2026</span>
            </div>
          </Reveal>
          <Stagger className="catgrid">
            {officers.slice(0, 6).map((p) => (
              <motion.article className="catcard" variants={stagItem} key={p.name}>
                <div className="catcard__photo">
                  <img src={p.img} alt={p.name} loading="lazy" />
                </div>
                <div className="catcard__body">
                  <span className="catcard__role">{p.role}</span>
                  <h4 className="catcard__name">{p.name}</h4>
                  <p className="catcard__detail">{p.detail}</p>
                </div>
              </motion.article>
            ))}
          </Stagger>
          <div className="center mt-l">
            <Link to="/governing-council" className="btn btn--ghost">View the full council</Link>
          </div>
        </div>
      </section>

      {/* Banner strip */}
      <section style={{ background: "var(--ink)" }}>
        <div className="wrap section" style={{ paddingBottom: 0 }}>
          <Reveal>
            <span className="eyebrow">In the field</span>
            <h2 className="section-title" style={{ color: "var(--text)" }}>
              National Library Week, across Karnataka.
            </h2>
          </Reveal>
        </div>
        <div style={{ marginTop: 48 }}>
          <Stagger className="slidestrip">
            {banners.map((b) => (
              <motion.div className="slidestrip__item" variants={stagItem} key={b.title}>
                <img src={b.img} alt={b.title} loading="lazy" />
                <div className="slidestrip__cap">
                  <div className="k">{b.kicker}</div>
                  <div className="t">{b.title}</div>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}

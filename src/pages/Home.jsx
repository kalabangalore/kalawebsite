import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Reveal, Stagger, stagItem, Counter } from "../components/primitives";
import { org, banners, heroSlides, stats, fiveLaws, homeAbout, objectivesShort } from "../data/content";
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
        <motion.div
          key="photo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            type="button"
            className="founder-photo"
            onClick={() => setPlaying(true)}
            aria-label="Play the film about Dr. S. R. Ranganathan"
          >
            <img src={org.founder} alt="Dr. S. R. Ranganathan" />
            <span className="frame" />
            <span className="plate">
              <span className="plate__name">Dr. S. R. Ranganathan</span>
              <span className="plate__role">Father of Library Science, India</span>
              <span className="plate__sub">Founder of Karnataka State Library Association</span>
            </span>
          </button>
          <p className="founder-cta">▶ Click the photo to listen to the speaker</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero">
      <div className="hero__top wrap">
        <motion.h1
          className="hero__heading"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Karnataka State Library Association{" "}(R)
        </motion.h1>

        <motion.div
          className="hero__founder"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={org.founder} alt="Dr. S. R. Ranganathan" />
          <span className="frame" />
        </motion.div>
      </div>

      <div className="wrap">
        <div className="hero__bg">
          {heroSlides.map((src, i) => (
            <img key={i} src={src} alt="" className={i === slide ? "is-on" : ""} />
          ))}

          <div className="hero__dots">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                className={`hero__dot ${i === slide ? "is-on" : ""}`}
                onClick={() => setSlide(i)}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
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

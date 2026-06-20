import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { whatsNew } from "../data/content";

export default function WhatsNew() {
  return (
    <>
      <PageHead
        crumb={<span>What's New</span>}
        title="What's new"
        lead="Official notices and circulars from the Association."
      />

      <section className="section paper-bg">
        <div className="wrap" style={{ maxWidth: 880 }}>
          {whatsNew.map((n, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <article className="notice">
                <span className="tag">Notice</span>
                <h3>{n.title}</h3>
                <p className="meta">{n.meta}</p>
                {n.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {n.signoff && <div className="sign">{n.signoff}</div>}
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

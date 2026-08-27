import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { useSiteContent } from "../lib/useSiteContent";

export default function WhatsNew() {
  const { whatsNew, pageHeads } = useSiteContent();
  return (
    <>
      <PageHead
        crumb={<span>{pageHeads.whatsNew.crumbLabel}</span>}
        title={pageHeads.whatsNew.title}
        lead={pageHeads.whatsNew.lead}
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

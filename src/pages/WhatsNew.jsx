import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { useSiteContent } from "../lib/useSiteContent";
import { useNotices } from "../lib/useNotices";

export default function WhatsNew() {
  const { pageHeads } = useSiteContent();
  const notices = useNotices();
  const { hash } = useLocation();

  // Deep link from the homepage notifications carousel — jump straight to
  // the notice that was clicked, once it's rendered.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [hash, notices.length]);

  return (
    <>
      <PageHead
        crumb={<span>{pageHeads.whatsNew.crumbLabel}</span>}
        title={pageHeads.whatsNew.title}
        lead={pageHeads.whatsNew.lead}
      />

      <section className="section paper-bg">
        <div className="wrap" style={{ maxWidth: 880 }}>
          {notices.length === 0 && <p className="lead">No notices at the moment — check back soon.</p>}
          {notices.map((n, i) => (
            <Reveal key={n.id} delay={Math.min(i, 6) * 0.05}>
              <article className="notice" id={`notice-${n.id}`}>
                <span className="tag">Notice</span>
                {n.image && <img className="notice__img" src={n.image} alt={n.title} loading="lazy" />}
                <h3>{n.title}</h3>
                {n.date && <p className="meta">{n.date}</p>}
                {n.body && <p>{n.body}</p>}
                {n.link && (
                  <a className="btn btn--solid mt-l" href={n.link} target="_blank" rel="noreferrer">
                    Register / view form →
                  </a>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

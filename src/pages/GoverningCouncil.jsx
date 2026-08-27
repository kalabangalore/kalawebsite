import { motion } from "motion/react";
import { Link } from "react-router-dom";
import PageHead from "../components/PageHead";
import { Reveal, Stagger, stagItem } from "../components/primitives";
import { useSiteContent } from "../lib/useSiteContent";
import { COUNCIL_ROLES } from "../data/siteContentDefaults";

export default function GoverningCouncil() {
  const { council, pageHeads } = useSiteContent();
  const groups = COUNCIL_ROLES.map((role) => ({
    role,
    people: council.filter((c) => c.role === role),
  })).filter((g) => g.people.length);

  return (
    <>
      <PageHead
        crumb={<span>{pageHeads.governingCouncil.crumbLabel}</span>}
        title={pageHeads.governingCouncil.title}
        lead={pageHeads.governingCouncil.lead}
      />

      <section className="section paper-bg">
        <div className="wrap">
          {groups.map((g) => (
            <div key={g.role}>
              <Reveal>
                <div className="rolehead">
                  <h3>{g.role}</h3>
                  <span className="rule" />
                  <span className="count">{String(g.people.length).padStart(2, "0")}</span>
                </div>
              </Reveal>
              <Stagger className="catgrid">
                {g.people.map((p) => (
                  <motion.article className="catcard" variants={stagItem} key={p.name}>
                    <div className="catcard__photo">
                      <img src={p.img} alt={p.name} loading="lazy" />
                    </div>
                    <div className="catcard__body">
                      <span className="catcard__role">{p.role}</span>
                      <h4 className="catcard__name">{p.name}</h4>
                      <p className="catcard__detail">{p.detail}</p>
                      {(p.email || p.phone) && (
                        <div className="catcard__meta">
                          {p.email && (
                            <div>
                              <a href={`mailto:${p.email}`}>{p.email}</a>
                            </div>
                          )}
                          {p.phone && <div>{p.phone}</div>}
                        </div>
                      )}
                    </div>
                  </motion.article>
                ))}
              </Stagger>
            </div>
          ))}

          <Reveal>
            <div className="center mt-l">
              <Link to="/members" className="btn btn--ghost">
                Browse all 1,500+ members →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

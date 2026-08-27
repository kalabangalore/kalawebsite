import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useSiteContent } from "../lib/useSiteContent";
import { DEFAULT_NAV_LINKS } from "../data/siteContentDefaults";
import Marquee from "./Marquee";

// Route/end-match are fixed in code — never admin-editable, so a bad settings
// value can never break routing. Only each entry's label text is overlaid
// from the admin-edited navLabels array, by index.
const LINKS = DEFAULT_NAV_LINKS;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const heroNav = isHome && !scrolled;
  const { org, navLabels } = useSiteContent();
  const labelFor = (i, fallback) => navLabels[i] ?? fallback;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <>
      <header className={`nav ${scrolled ? "nav--scrolled" : ""} ${heroNav ? "nav--hero" : ""}`}>
        <div className="nav__inner">
          <Link to="/" className="nav__brand" aria-label="KALA home">
            <img src={org.logo} alt="KALA" />
            <span className="nav__brand-reg">Reg. No. 829/88-89</span>
          </Link>

          <nav className="nav__links">
            {LINKS.map((l, i) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav__link">
                {labelFor(i, l.label)}
              </NavLink>
            ))}
            <Link to="/contact" className="btn btn--solid nav__cta">
              Contact
            </Link>
          </nav>

          <div className="nav__founder">
            <img src={org.founder} alt="Dr. S. R. Ranganathan" />
          </div>

          <button
            className="nav__burger"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span style={open ? { transform: "translateY(7px) rotate(45deg)" } : {}} />
            <span style={open ? { opacity: 0 } : {}} />
            <span style={open ? { transform: "translateY(-7px) rotate(-45deg)" } : {}} />
          </button>
        </div>

        <Marquee />
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="drawer"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {LINKS.map((l, i) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {labelFor(i, l.label)}
              </NavLink>
            ))}
            <NavLink to="/contact">Contact</NavLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

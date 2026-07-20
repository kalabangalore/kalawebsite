import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { org } from "../data/content";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/aims-objectives", label: "Aims" },
  { to: "/governing-council", label: "Council" },
  { to: "/members", label: "Members" },
  { to: "/membership", label: "Membership" },
  { to: "/activities", label: "Activities" },
  { to: "/blog", label: "Blog" },
  { to: "/whats-new", label: "What's New" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <>
      <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
        <div className="nav__inner">
          <Link to="/" className="nav__brand" aria-label="KALA home">
            <img src={org.logo} alt="" />
            <span className="nav__brand-text">
              <b>KALA</b>
              <span>Library Association</span>
              <span className="nav__brand-reg">Reg. No. 829/88-89</span>
            </span>
          </Link>

          <nav className="nav__links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav__link">
                {l.label}
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
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/contact">Contact</NavLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

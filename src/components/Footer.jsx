import { Link } from "react-router-dom";
import { org } from "../data/content";

export default function Newsletter() {
  return (
    <section className="newsletter">
      <div className="wrap newsletter__inner">
        <div>
          <h3>Get the latest from KALA in your inbox.</h3>
        </div>
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.currentTarget.reset();
            }}
          >
            <input type="email" required placeholder="your@email.com" aria-label="Email" />
            <button type="submit">Subscribe</button>
          </form>
          <p className="note">No spam — only association news and event notices.</p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            <img src={org.logo} alt="KALA" />
            <p>
              A registered association advancing the library and information science profession across
              Karnataka — in the lineage of Dr. S. R. Ranganathan.
            </p>
          </div>
          <div className="footer__col">
            <h4>About</h4>
            <Link to="/aims-objectives">Aims & Objectives</Link>
            <Link to="/governing-council">Governing Council</Link>
            <Link to="/activities">Activities</Link>
          </div>
          <div className="footer__col">
            <h4>Members</h4>
            <Link to="/members">Members</Link>
            <Link to="/membership">Membership</Link>
            <Link to="/certificate">Find my certificate</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/whats-new">What's New</Link>
          </div>
          <div className="footer__col">
            <h4>Contact</h4>
            <a href={`tel:${org.phone.replace(/\s/g, "")}`}>{org.phone}</a>
            <a href={`mailto:${org.email}`}>{org.email}</a>
            <Link to="/contact">Send a message</Link>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Karnataka State Library Association (R). All rights reserved.</span>
          <span><Link to="/admin">Admin</Link> · Books are for use.</span>
        </div>
      </div>
    </footer>
  );
}

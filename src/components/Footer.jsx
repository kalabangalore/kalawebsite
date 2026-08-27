import { Link } from "react-router-dom";
import { useSiteContent } from "../lib/useSiteContent";

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
  const { contact, org, footer } = useSiteContent();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            <img src={org.logo} alt="KALA" />
            <p>{footer.blurb}</p>
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
            <Link to="/blog">News and Views</Link>
            <Link to="/whats-new">Notifications</Link>
          </div>
          <div className="footer__col">
            <h4>Contact</h4>
            <a href={`tel:${contact.altPhone.replace(/\s/g, "")}`}>{contact.altPhone}</a>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <Link to="/contact">Send a message</Link>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {footer.copyright}</span>
          <span><Link to="/admin">Admin</Link> · Books are for use.</span>
        </div>
      </div>
    </footer>
  );
}

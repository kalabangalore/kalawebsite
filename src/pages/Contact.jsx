import { useState } from "react";
import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { org } from "../data/content";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHead
        crumb={<span>Contact</span>}
        title="Get in touch"
        lead="Questions about membership, events or the Association? Write to the General Secretary."
      />

      <section className="section paper-bg">
        <div className="wrap contactgrid">
          <Reveal>
            <span className="eyebrow">Reach us</span>
            <ul className="cinfo" style={{ marginTop: 24 }}>
              <li>
                <div className="k">Address</div>
                <div className="v">{org.address}</div>
              </li>
              <li>
                <div className="k">Phone</div>
                <div className="v">
                  <a href={`tel:${org.altPhone.replace(/\s/g, "")}`}>{org.altPhone}</a>
                </div>
              </li>
              <li>
                <div className="k">Email</div>
                <div className="v">
                  <a href={`mailto:${org.email}`}>{org.email}</a>
                </div>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              className="cform"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="row2">
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" required placeholder="Your name" />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" required placeholder="your@email.com" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <input id="subject" placeholder="What's this about?" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="msg">Message</label>
                <textarea id="msg" rows="5" required placeholder="Write your message…" />
              </div>
              {sent ? (
                <p className="formnote" style={{ color: "#9a6a28" }}>
                  Thanks — your message is ready to send. We'll get back to you at the email you provided.
                </p>
              ) : (
                <button type="submit" className="btn btn--solid" style={{ alignSelf: "flex-start" }}>
                  Send message →
                </button>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}

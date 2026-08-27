import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "./primitives";
import { useNotices } from "../lib/useNotices";

const ROTATE_MS = 6000;
const MAX_ITEMS = 8;
const EXCERPT_LEN = 160;

// Homepage carousel of the latest notices — clicking a card jumps to that
// notice's full detail on the Notifications (What's New) page. Renders
// nothing when there are no notices, same as the nav marquee.
export default function NotificationsCarousel() {
  const allNotices = useNotices();
  const items = allNotices.slice(0, MAX_ITEMS);
  const [i, setI] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setI(0);
    if (items.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;
  const notice = items[i];
  const excerpt = notice.body && notice.body.length > EXCERPT_LEN ? notice.body.slice(0, EXCERPT_LEN) + "…" : notice.body;

  function open() {
    navigate(`/whats-new#notice-${notice.id}`);
  }

  return (
    <section className="section paper-bg">
      <div className="wrap">
        <Reveal>
          <div className="rolehead">
            <h3>Notifications</h3>
            <span className="rule" />
            <span className="count">Latest updates</span>
          </div>
        </Reveal>

        <div className="notifcarousel">
          <AnimatePresence mode="wait">
            <motion.button
              key={notice.id}
              type="button"
              className="notifcarousel__card"
              onClick={open}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="notifcarousel__media"
                style={notice.image ? { backgroundImage: `url(${notice.image})` } : undefined}
              >
                {!notice.image && <span className="notifcarousel__ph">KALA</span>}
              </div>
              <div className="notifcarousel__body">
                {notice.date && <span className="notifcarousel__date">{notice.date}</span>}
                <h3>{notice.title}</h3>
                {excerpt && <p>{excerpt}</p>}
                <span className="notifcarousel__more">View details →</span>
              </div>
            </motion.button>
          </AnimatePresence>
        </div>

        {items.length > 1 && (
          <div className="notifcarousel__dots">
            {items.map((n, idx) => (
              <button
                key={n.id}
                type="button"
                className={`notifcarousel__dot ${idx === i ? "is-on" : ""}`}
                onClick={() => setI(idx)}
                aria-label={`Show notice ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

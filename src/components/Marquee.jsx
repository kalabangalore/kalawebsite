import { useNavigate } from "react-router-dom";
import { useNotices } from "../lib/useNotices";

// Scrolling strip of the latest notices — shown on the Home page only, right
// below the hero title (see Home.jsx). Each item is individually clickable,
// jumping straight to that notice's full detail on the Notifications page.
// Renders nothing when there are no notices.
export default function Marquee() {
  const notices = useNotices();
  const navigate = useNavigate();

  if (!notices.length) return null;

  const items = notices.slice(0, 10);
  // The track scrolls by translating exactly -50%, so the two halves must be
  // identical and, together, wider than any real viewport — otherwise (e.g.
  // just one short notice) the track is narrower than the bar and most of
  // it sits empty until the loop restarts. Repeat the item list enough
  // times per half to guarantee that regardless of how few notices exist.
  const repeat = Math.max(4, Math.ceil(16 / items.length));
  const half = Array(repeat).fill(items).flat();

  return (
    <div className="marquee" role="region" aria-label="Latest notices">
      <div className="marquee__track">
        {[...half, ...half].map((n, i) => (
          <button
            type="button"
            className="marquee__item"
            key={`${n.id}-${i}`}
            onClick={() => navigate(`/whats-new#notice-${n.id}`)}
          >
            <b>Notice:</b> {n.marqueeText || n.title}
            {n.date ? ` — ${n.date}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

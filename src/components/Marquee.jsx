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

  return (
    <div className="marquee" role="region" aria-label="Latest notices">
      <div className="marquee__track">
        {[...items, ...items].map((n, i) => (
          <button
            type="button"
            className="marquee__item"
            key={`${n.id}-${i}`}
            onClick={() => navigate(`/whats-new#notice-${n.id}`)}
          >
            <b>Notice:</b> {n.title}
            {n.date ? ` — ${n.date}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

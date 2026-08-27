import { useEffect } from "react";
import { useNotices } from "../lib/useNotices";

// Scrolling strip of the latest notices, rendered inside Nav's fixed header
// (see Nav.jsx). Renders nothing when there are no notices — no empty bar.
// Every page reserves top space for this via the --marquee-h CSS variable,
// which only switches on (see body.has-notices in index.css) while a
// marquee is actually present, so an empty notices list leaves no gap.
export default function Marquee() {
  const notices = useNotices();

  useEffect(() => {
    document.body.classList.toggle("has-notices", notices.length > 0);
    return () => document.body.classList.remove("has-notices");
  }, [notices.length]);

  if (!notices.length) return null;

  const items = notices.slice(0, 10);

  return (
    <div className="marquee" role="region" aria-label="Latest notices">
      <div className="marquee__track">
        {[...items, ...items].map((n, i) => (
          <span className="marquee__item" key={`${n.id}-${i}`}>
            <b>Notice:</b> {n.title}
            {n.date ? ` — ${n.date}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

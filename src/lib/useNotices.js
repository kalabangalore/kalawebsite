import { useEffect, useState } from "react";
import { api } from "./api";

// Separate from useSiteContent: notices come from their own endpoint/settings
// key (a frequently-mutated list, unlike the rest of the mostly-static page
// content), but follow the same fetch-once/cache/fallback shape.
let cached = null;
function fetchOnce() {
  if (!cached) cached = api.getNotices().then((r) => r.notices).catch(() => []);
  return cached;
}

export function useNotices() {
  const [notices, setNotices] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchOnce().then((n) => {
      if (alive) setNotices(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  return notices;
}

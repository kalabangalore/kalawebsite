import { useEffect, useState } from "react";
import { api } from "./api";
import { DEFAULT_SITE_CONTENT } from "../data/siteContentDefaults";

// Fetched once per page load and shared across every component that calls
// this hook, so Home/Footer/Contact/etc. don't each trigger their own request.
let cached = null;
function fetchOnce() {
  if (!cached) cached = api.getSiteContent().catch(() => DEFAULT_SITE_CONTENT);
  return cached;
}

export function useSiteContent() {
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);
  useEffect(() => {
    let alive = true;
    fetchOnce().then((c) => {
      if (alive) setContent(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return content;
}

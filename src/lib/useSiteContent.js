import { useEffect, useState } from "react";
import { api } from "./api";
import { heroSlides as defaultHeroSlides, banners as defaultBanners, org } from "../data/content";

const DEFAULT_CONTENT = {
  heroSlides: defaultHeroSlides,
  banners: defaultBanners,
  contact: { altPhone: org.altPhone, email: org.email, address: org.address },
};

// Fetched once per page load and shared across every component that calls
// this hook, so Home/Footer/Contact don't each trigger their own request.
let cached = null;
function fetchOnce() {
  if (!cached) cached = api.getSiteContent().catch(() => DEFAULT_CONTENT);
  return cached;
}

export function useSiteContent() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
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

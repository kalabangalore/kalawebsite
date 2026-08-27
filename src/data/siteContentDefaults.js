// Single source of truth for admin-editable site content defaults — used by
// BOTH the server (server/app.js, as the fallback when no settings row
// exists yet) and the client (src/lib/useSiteContent.js, as the fallback
// before the API call resolves). Keeping one module instead of two hand-
// synced literals means client and server can never drift out of sync.
import {
  heroSlides,
  banners,
  org,
  stats,
  fiveLaws,
  homeAbout,
  objectivesShort,
  aims,
  membership,
  blog,
  whatsNew,
} from "./content.js";
import { activities } from "./activities.js";
import { council } from "./council.js";

// Structural nav data (route + end-match) stays fixed in code — only the
// label text is admin-editable, via an index-matched overlay (see Nav.jsx).
export const DEFAULT_NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/aims-objectives", label: "Aims" },
  { to: "/governing-council", label: "Council" },
  { to: "/members", label: "Members" },
  { to: "/membership", label: "Membership" },
  { to: "/activities", label: "Activities" },
  { to: "/blog", label: "News and Views" },
  { to: "/whats-new", label: "Notifications" },
];

// The 5 canonical council role groups GoverningCouncil.jsx / Home.jsx group
// and filter by — kept here so the admin council editor can constrain the
// "role" field to a <select> of exactly these values instead of free text.
export const COUNCIL_ROLES = ["President", "Vice Presidents", "Secretaries", "Treasurer", "Governing Council Members"];

export const DEFAULT_PAGE_HEADS = {
  governingCouncil: { crumbLabel: "Governing Council", title: "The Executive Councils", lead: "The office bearers who steer the Association for the 2024–2026 term." },
  members: { crumbLabel: "Members", title: "The membership roll", lead: "More than fifteen hundred library and information professionals across Karnataka and beyond. Search by name — listed in order of membership ID." },
  activities: { crumbLabel: "Activities", title: "National Library Week 2025", lead: "A week of talks, field meets and partner sessions hosted across Karnataka's universities, colleges and research centres." },
  blog: { crumbLabel: "Blog", title: "News and Views", lead: "Notes from the Association — conferences, library weeks, and the ideas that move the profession forward." },
  whatsNew: { crumbLabel: "What's New", title: "What's new", lead: "Official notices and circulars from the Association." },
  contact: { crumbLabel: "Contact", title: "Get in touch", lead: "Questions about membership, events or the Association? Write to the General Secretary." },
  aimsObjectives: { crumbLabel: "Aims & Objectives", title: "Aims & Objectives" },
  membership: { crumbLabel: "Membership", title: "Join the Association" },
};

export const DEFAULT_FOOTER = {
  blurb: "A registered association advancing the library and information science profession across Karnataka — in the lineage of Dr. S. R. Ranganathan.",
  copyright: "Karnataka State Library Association (R). All rights reserved.",
};

export const DEFAULT_SITE_CONTENT = {
  heroSlides,
  banners,
  contact: { altPhone: org.altPhone, email: org.email, address: org.address },
  org: { name: org.name, tagline: org.tagline, logo: org.logo, founder: org.founder },
  stats,
  fiveLaws,
  homeAbout,
  objectivesShort,
  aims,
  membership,
  activities,
  blog,
  whatsNew,
  council,
  navLabels: DEFAULT_NAV_LINKS.map((l) => l.label),
  footer: DEFAULT_FOOTER,
  pageHeads: DEFAULT_PAGE_HEADS,
};

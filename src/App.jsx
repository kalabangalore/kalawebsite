import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Nav from "./components/Nav";
import Newsletter, { Footer } from "./components/Footer";

import Home from "./pages/Home";
import AimsObjectives from "./pages/AimsObjectives";
import GoverningCouncil from "./pages/GoverningCouncil";
import Members from "./pages/Members";
import Membership from "./pages/Membership";
import Activities from "./pages/Activities";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import WhatsNew from "./pages/WhatsNew";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), [pathname]);
  return null;
}

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <ScrollToTop />
        <Routes location={location}>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Nav />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/aims-objectives" element={<Page><AimsObjectives /></Page>} />
          <Route path="/governing-council" element={<Page><GoverningCouncil /></Page>} />
          <Route path="/members" element={<Page><Members /></Page>} />
          <Route path="/membership" element={<Page><Membership /></Page>} />
          <Route path="/activities" element={<Page><Activities /></Page>} />
          <Route path="/blog" element={<Page><Blog /></Page>} />
          <Route path="/blog/:slug" element={<Page><BlogPost /></Page>} />
          <Route path="/whats-new" element={<Page><WhatsNew /></Page>} />
          <Route path="/contact" element={<Page><Contact /></Page>} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Routes>
      </AnimatePresence>
      <Newsletter />
      <Footer />
    </>
  );
}

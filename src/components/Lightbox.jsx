import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

// Fullscreen image viewer. Pass the currently-open image ({src, alt}) or
// null, plus a close handler.
export default function Lightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [image, onClose]);

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="lightbox"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button className="lightbox__close" onClick={onClose} aria-label="Close">×</button>
          <motion.img
            src={image.src}
            alt={image.alt || ""}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

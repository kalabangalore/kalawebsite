import { Link } from "react-router-dom";
import { motion } from "motion/react";

export default function PageHead({ crumb, title, lead }) {
  return (
    <header className="pagehead">
      <div className="wrap">
        <motion.div
          className="crumb"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/">Home</Link>
          <span>/</span>
          {crumb}
        </motion.div>
        <motion.h1
          className="h-display"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          {title}
        </motion.h1>
        {lead && (
          <motion.p
            className="lead"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {lead}
          </motion.p>
        )}
      </div>
    </header>
  );
}

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Stagger, stagItem } from "../components/primitives";
import { blog } from "../data/content";

export default function Blog() {
  return (
    <>
      <PageHead
        crumb={<span>Blog</span>}
        title="News and Views"
        lead="Notes from the Association — conferences, library weeks, and the ideas that move the profession forward."
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Stagger className="bloggrid" gap={0.1}>
            {blog.map((post) => (
              <motion.article className="blogcard" variants={stagItem} key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="blogcard__img">
                  <img src={post.img} alt={post.title} loading="lazy" />
                </Link>
                <div className="blogcard__body">
                  <span className="blogcard__date">{post.date}</span>
                  <h3 className="blogcard__title">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p className="blogcard__ex">{post.excerpt}</p>
                  <Link to={`/blog/${post.slug}`} className="blogcard__more">
                    Read the post →
                  </Link>
                </div>
              </motion.article>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}

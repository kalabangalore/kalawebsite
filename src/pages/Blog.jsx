import { Link } from "react-router-dom";
import { motion } from "motion/react";
import PageHead from "../components/PageHead";
import { Stagger, stagItem } from "../components/primitives";
import { useSiteContent } from "../lib/useSiteContent";

export default function Blog() {
  const { blog, pageHeads } = useSiteContent();
  return (
    <>
      <PageHead
        crumb={<span>{pageHeads.blog.crumbLabel}</span>}
        title={pageHeads.blog.title}
        lead={pageHeads.blog.lead}
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

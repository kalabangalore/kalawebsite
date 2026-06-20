import { useParams, Link, Navigate } from "react-router-dom";
import PageHead from "../components/PageHead";
import { Reveal } from "../components/primitives";
import { blog } from "../data/content";

export default function BlogPost() {
  const { slug } = useParams();
  const post = blog.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <PageHead
        crumb={
          <>
            <Link to="/blog">Blog</Link>
            <span>/</span>
            {post.date}
          </>
        }
        title={post.title}
      />

      <section className="section paper-bg">
        <div className="wrap">
          <Reveal className="article">
            <img className="article__img" src={post.img} alt={post.title} />
            {post.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="mt-l">
              <Link to="/blog" className="btn btn--ghost">← All posts</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

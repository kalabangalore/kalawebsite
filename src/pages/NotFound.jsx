import { Link } from "react-router-dom";
import PageHead from "../components/PageHead";

export default function NotFound() {
  return (
    <>
      <PageHead
        crumb={<span>404</span>}
        title="This shelf is empty."
        lead="The page you're looking for has been re-catalogued or never existed. Let's get you back to a known location."
      />
      <section className="section paper-bg">
        <div className="wrap center">
          <Link to="/" className="btn btn--solid">Return home →</Link>
        </div>
      </section>
    </>
  );
}

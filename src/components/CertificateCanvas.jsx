import { useEffect, useRef, useState } from "react";
import { drawCertificate, loadImage } from "../lib/certificate";

const TEMPLATE = {
  draft: "/certificates/certificate-draft.png",
  signed: "/certificates/certificate-signed.png",
};

// Renders a membership certificate onto a <canvas>, re-drawing whenever the
// template, layout, or field values change. Nothing here is ever persisted —
// it's composited fresh in the browser every time.
export default function CertificateCanvas({ variant = "draft", layout, data, className }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImage(TEMPLATE[variant]).then((img) => {
      if (cancelled || !canvasRef.current) return;
      drawCertificate(canvasRef.current, { templateImg: img, layout, data });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [variant, layout, data]);

  return (
    <div className={`certcanvas ${className || ""}`}>
      <canvas ref={canvasRef} className={ready ? "is-ready" : ""} />
    </div>
  );
}

export function downloadCanvas(container, filename) {
  const canvas = container?.querySelector("canvas");
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "certificate.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

import { useEffect, useRef, useState } from "react";
import { drawCertificate, loadImage } from "../lib/certificate";

const TEMPLATE = {
  draft: "/certificates/certificate-draft.png",
  signed: "/certificates/certificate-signed.png",
};

// Renders a membership certificate onto a <canvas>, re-drawing whenever the
// template, layout, or field values change. Nothing here is ever persisted —
// it's composited fresh in the browser every time.
export default function CertificateCanvas({ variant = "draft", layout, data, className, onReady }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImage(TEMPLATE[variant]).then((img) => {
      if (cancelled || !canvasRef.current) return;
      drawCertificate(canvasRef.current, { templateImg: img, layout, data });
      setReady(true);
      onReady?.(canvasRef.current);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, layout, data]);

  return (
    <div className={`certcanvas ${className || ""}`}>
      <canvas ref={canvasRef} className={ready ? "is-ready" : ""} />
    </div>
  );
}

// JPEG rather than PNG for anything leaving the browser (download, email
// attachment) — the template is a detailed gradient/photo-like image that
// PNG compresses poorly, easily exceeding the API's request body limit.
// JPEG at this quality looks identical for a certificate and is a fraction
// of the size.
const EXPORT_TYPE = "image/jpeg";
const EXPORT_QUALITY = 0.9;

export function downloadCanvas(container, filename) {
  const canvas = container?.querySelector("canvas");
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "certificate.jpg";
    a.click();
    URL.revokeObjectURL(url);
  }, EXPORT_TYPE, EXPORT_QUALITY);
}

// Returns { fileBase64, mimeType } ready to hand to the API for emailing —
// same compact JPEG encoding as downloadCanvas.
export function canvasToAttachment(canvas) {
  const fileBase64 = canvas.toDataURL(EXPORT_TYPE, EXPORT_QUALITY).split(",")[1];
  return { fileBase64, mimeType: EXPORT_TYPE };
}

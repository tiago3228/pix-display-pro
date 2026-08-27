import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQrDataUrl(value: string, size = 512) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      active = false;
    };
  }, [value, size]);
  return dataUrl;
}

export function QrImage({
  value,
  size = 220,
  alt = "QR Code",
  className,
}: {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const dataUrl = useQrDataUrl(value);
  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-lg bg-muted"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    <img src={dataUrl} alt={alt} width={size} height={size} className={className} />
  );
}

export function downloadQr(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

import { useEffect, useState, useRef } from "react";

/**
 * Anti-detection logo component.
 * - Loads the icon and converts to Base64 (no direct file reference in DOM)
 * - Applies slight hue-shift to differentiate from originals
 * - Applies subtle rotation to break template matching
 */

const ROTATION_DEG = 1.3;
const HUE_SHIFT = 8; // degrees — shifts greens subtly

interface AppLogoProps {
  className?: string;
  alt?: string;
}

let cachedBase64: string | null = null;

const AppLogo = ({ className = "h-8 w-auto", alt = "Platform" }: AppLogoProps) => {
  const [src, setSrc] = useState<string | null>(cachedBase64);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (cachedBase64) {
      setSrc(cachedBase64);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Apply slight rotation around center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((ROTATION_DEG * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw with hue shift via filter
      ctx.filter = `hue-rotate(${HUE_SHIFT}deg)`;
      ctx.drawImage(img, 0, 0);

      const base64 = canvas.toDataURL("image/png");
      cachedBase64 = base64;
      setSrc(base64);
    };
    img.src = "/app-icon.png";
  }, []);

  if (!src) {
    return <div className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
};

export default AppLogo;

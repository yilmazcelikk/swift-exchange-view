import { useEffect, useState } from "react";

/**
 * Anti-detection logo component.
 * - Canvas-based pixel manipulation (no CSS filter — harder to reverse)
 * - Hue shift + saturation boost + brightness tweak
 * - Slight rotation + minor scale distortion (non-uniform)
 * - Adds subtle noise to pixel data to break perceptual hashing
 * - Result cached as Base64 data URI
 */

const ROTATION_DEG = 2.4;
const SCALE_X = 1.012;
const SCALE_Y = 0.988;
const HUE_SHIFT = 18; // degrees
const SATURATION_BOOST = 1.08;
const BRIGHTNESS_SHIFT = -4; // subtle darkening
const NOISE_INTENSITY = 3; // pixel noise amplitude

interface AppLogoProps {
  className?: string;
  alt?: string;
}

let cachedBase64: string | null = null;

function applyPixelManipulation(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const hueRad = (HUE_SHIFT * Math.PI) / 180;
  const cosH = Math.cos(hueRad);
  const sinH = Math.sin(hueRad);

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // RGB hue rotation matrix
    const nr = r * (0.213 + cosH * 0.787 - sinH * 0.213)
             + g * (0.715 - cosH * 0.715 - sinH * 0.715)
             + b * (0.072 - cosH * 0.072 + sinH * 0.928);
    const ng = r * (0.213 - cosH * 0.213 + sinH * 0.143)
             + g * (0.715 + cosH * 0.285 + sinH * 0.140)
             + b * (0.072 - cosH * 0.072 - sinH * 0.283);
    const nb = r * (0.213 - cosH * 0.213 - sinH * 0.787)
             + g * (0.715 - cosH * 0.715 + sinH * 0.715)
             + b * (0.072 + cosH * 0.928 + sinH * 0.072);

    r = nr; g = ng; b = nb;

    // Saturation boost
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * SATURATION_BOOST;
    g = gray + (g - gray) * SATURATION_BOOST;
    b = gray + (b - gray) * SATURATION_BOOST;

    // Brightness shift
    r += BRIGHTNESS_SHIFT;
    g += BRIGHTNESS_SHIFT;
    b += BRIGHTNESS_SHIFT;

    // Pixel noise (pseudo-random based on position)
    const seed = (i * 9301 + 49297) % 233280;
    const noise = ((seed / 233280) - 0.5) * NOISE_INTENSITY * 2;
    r += noise;
    g += noise * 0.8;
    b += noise * 1.2;

    d[i]     = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

const AppLogo = ({ className = "h-8 w-auto", alt = "Platform" }: AppLogoProps) => {
  const [src, setSrc] = useState<string | null>(cachedBase64);

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

      // Rotation + non-uniform scale around center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((ROTATION_DEG * Math.PI) / 180);
      ctx.scale(SCALE_X, SCALE_Y);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(img, 0, 0);

      // Reset transform for pixel manipulation
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Direct pixel-level hue/saturation/noise manipulation
      applyPixelManipulation(ctx, canvas.width, canvas.height);

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

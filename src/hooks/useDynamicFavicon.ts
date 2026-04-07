import { useEffect } from "react";

/**
 * Dynamically generates a favicon that matches the AppLogo's
 * canvas-based pixel manipulation (hue shift, rotation, noise, etc.)
 * so the browser tab icon matches the in-app logo.
 */

const ROTATION_DEG = -3.6;
const SCALE_X = 1.025;
const SCALE_Y = 0.975;
const HUE_SHIFT = 32;
const SATURATION_BOOST = 1.15;
const BRIGHTNESS_SHIFT = -8;
const NOISE_INTENSITY = 5;
const CONTRAST_BOOST = 1.06;

function applyPixelManipulation(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const hueRad = (HUE_SHIFT * Math.PI) / 180;
  const cosH = Math.cos(hueRad);
  const sinH = Math.sin(hueRad);

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

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

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * SATURATION_BOOST;
    g = gray + (g - gray) * SATURATION_BOOST;
    b = gray + (b - gray) * SATURATION_BOOST;

    r += BRIGHTNESS_SHIFT;
    g += BRIGHTNESS_SHIFT;
    b += BRIGHTNESS_SHIFT;

    r = 128 + (r - 128) * CONTRAST_BOOST;
    g = 128 + (g - 128) * CONTRAST_BOOST;
    b = 128 + (b - 128) * CONTRAST_BOOST;

    const seed = (i * 9301 + 49297) % 233280;
    const seed2 = (i * 7919 + 12347) % 233280;
    const noise1 = ((seed / 233280) - 0.5) * NOISE_INTENSITY * 2;
    const noise2 = ((seed2 / 233280) - 0.5) * NOISE_INTENSITY * 2;
    r += noise1;
    g += noise2 * 0.9;
    b += noise1 * 0.7 + noise2 * 0.5;

    d[i]     = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function useDynamicFavicon() {
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.translate(size / 2, size / 2);
      ctx.rotate((ROTATION_DEG * Math.PI) / 180);
      ctx.scale(SCALE_X, SCALE_Y);
      ctx.translate(-size / 2, -size / 2);
      ctx.drawImage(img, 0, 0, size, size);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyPixelManipulation(ctx, size, size);

      const dataUrl = canvas.toDataURL("image/png");

      // Update existing favicon link or create one
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = dataUrl;

      // Also update apple-touch-icon
      let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (appleLink) {
        appleLink.href = dataUrl;
      }
    };
    img.src = "/app-icon.png";
  }, []);
}

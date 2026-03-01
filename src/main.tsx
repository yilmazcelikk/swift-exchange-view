import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");

const renderFatalBootstrap = (message: string) => {
  if (!rootEl) return;

  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e27;color:#ef4444;font-family:system-ui;padding:24px;text-align:center;">
      <div>
        <p style="margin-bottom:12px;">${message}</p>
        <button onclick="window.location.reload()" style="background:#1f2937;color:#fff;border:1px solid #334155;border-radius:8px;padding:8px 14px;cursor:pointer;">Sayfayı Yenile</button>
      </div>
    </div>
  `;
};

if (!rootEl) {
  console.error("Root element bulunamadı (#root)");
} else {
  const bootTimeout = window.setTimeout(() => {
    const loadingEl = document.getElementById("app-loading");
    if (loadingEl) {
      console.error("Bootstrap timeout: app-loading kaldırılmadı.");
      renderFatalBootstrap("Uygulama başlatılamadı. Lütfen sayfayı yenileyin.");
    }
  }, 8000);

  try {
    createRoot(rootEl).render(<App />);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.clearTimeout(bootTimeout);
      });
    });
  } catch (err) {
    window.clearTimeout(bootTimeout);
    console.error("Fatal mount error:", err);
    renderFatalBootstrap("Uygulama başlatılırken kritik hata oluştu.");
  }
}


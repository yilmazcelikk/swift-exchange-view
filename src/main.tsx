import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");

if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("Fatal mount error:", err);
    rootEl.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e27;color:#ef4444;font-family:system-ui"><p>Uygulama başlatılamadı. Sayfayı yenileyin.</p></div>';
  }
}

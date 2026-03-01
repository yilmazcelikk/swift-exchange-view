import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
  } catch (err) {
    console.error("Fatal mount error:", err);
    rootElement.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e27;color:#ef4444;font-family:system-ui;"><p>Uygulama başlatılamadı. Sayfayı yenileyin.</p></div>';
  }
} else {
  console.error("Root element not found");
}

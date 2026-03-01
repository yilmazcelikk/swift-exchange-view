import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

const renderFatalFallback = () => {
  root.render(
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Uygulama başlatılamadı</h1>
        <p className="text-sm text-muted-foreground">Lütfen sayfayı yenileyin. Sorun devam ederse tekrar yayın güncellemesi yapın.</p>
      </div>
    </div>
  );
};

void import("./App.tsx")
  .then(({ default: App }) => {
    root.render(<App />);
  })
  .catch((error) => {
    console.error("App bootstrap failed:", error);
    renderFatalFallback();
  });

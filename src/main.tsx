import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);

  import("./App.tsx")
    .then(({ default: App }) => {
      root.render(<App />);
    })
    .catch((error) => {
      console.error("App bootstrap error:", error);
      root.render(
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-3">
            <h1 className="text-xl font-semibold text-foreground">Giriş ekranı yüklenemedi</h1>
            <p className="text-sm text-muted-foreground">
              Uygulama güvenli moda alındı. Login sayfasını tekrar açabilirsiniz.
            </p>
            <a
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Login Sayfasını Aç
            </a>
          </div>
        </div>
      );
    });
} else {
  console.error("Root element not found");
}

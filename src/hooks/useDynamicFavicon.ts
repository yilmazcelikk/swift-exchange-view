import { useEffect } from "react";

const APP_ICON_SRC = "/app-icon.png?v=20260409b";

export function useDynamicFavicon() {
  useEffect(() => {
    const ensureLink = (rel: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = APP_ICON_SRC;
    };

    ensureLink("icon");
    ensureLink("shortcut icon");
    ensureLink("apple-touch-icon");
    ensureLink("apple-touch-icon-precomposed");
  }, []);
}

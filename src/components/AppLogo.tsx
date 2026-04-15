import { forwardRef } from "react";

const APP_ICON_SRC = "/app-icon.png?v=20260409b";

interface AppLogoProps {
  className?: string;
  alt?: string;
}
const AppLogo = forwardRef<HTMLImageElement, AppLogoProps>(
  ({ className = "h-8 w-auto", alt = "Platform" }, ref) => (
    <img
      ref={ref}
      src={APP_ICON_SRC}
      alt={alt}
      className={className}
      draggable={false}
    />
  )
);
AppLogo.displayName = "AppLogo";

export default AppLogo;

const APP_ICON_SRC = "/app-icon.png?v=20260409b";

interface AppLogoProps {
  className?: string;
  alt?: string;
}
const AppLogo = ({ className = "h-8 w-auto", alt = "Platform" }: AppLogoProps) => (
  <img
    src={APP_ICON_SRC}
    alt={alt}
    className={className}
    draggable={false}
  />
);

export default AppLogo;

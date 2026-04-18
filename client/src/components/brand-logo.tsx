interface BrandLogoProps {
  alt?: string;
  className?: string;
  darkClassName?: string;
  lightClassName?: string;
}

export function BrandLogo({
  alt = "Solturio Logo",
  className = "w-14 h-14 object-contain",
  lightClassName = "dark:hidden",
  darkClassName = "hidden dark:block",
}: BrandLogoProps) {
  return (
    <>
      <img
        src="/solturio-logo-light-mode.png"
        alt={alt}
        className={`${className} ${lightClassName}`.trim()}
      />
      <img
        src="/solturio-logo-dark-mode.png"
        alt={alt}
        className={`${className} ${darkClassName}`.trim()}
      />
    </>
  );
}

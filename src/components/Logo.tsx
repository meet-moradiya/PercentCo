export default function Logo({ className = "", size = 40, forceGold = false }: { className?: string; size?: number; forceGold?: boolean }) {
  // When forceGold is true (navbar over dark hero), always use gold.
  // Otherwise, use the CSS variable that switches with theme.
  const colorStyle = forceGold ? { color: "#c9a96e" } : { color: "var(--logo-color)" };

  return (
    <svg
      width={size * 3.5}
      height={size}
      viewBox="0 0 350 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors duration-300 ${className}`}
      aria-label="Percentco logo"
      style={colorStyle}
    >
      {/* Percent symbol mark */}
      <g>
        <circle cx="22" cy="32" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="42" cy="68" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <line x1="44" y1="24" x2="20" y2="76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Wordmark */}
      <text
        x="68"
        y="63"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="38"
        fontWeight="500"
        letterSpacing="8"
        fill="currentColor"
      >
        PERCENTCO
      </text>

      {/* Subtle tagline */}
      <text
        x="70"
        y="82"
        fontFamily="'Inter', 'Helvetica Neue', sans-serif"
        fontSize="9"
        letterSpacing="5"
        fill="currentColor"
        opacity="0.5"
      >
        FINE DINING
      </text>

      {/* Decorative lines */}
      <line x1="68" y1="78" x2="68" y2="83" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="160" y1="78" x2="160" y2="83" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

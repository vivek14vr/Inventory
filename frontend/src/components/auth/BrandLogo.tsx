type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
};

const sizes = {
  sm: "h-9 w-9 rounded-lg [&_svg]:h-4 [&_svg]:w-4",
  md: "h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-14 w-14 rounded-2xl [&_svg]:h-7 [&_svg]:w-7",
};

export function BrandLogo({ size = "md", variant = "dark" }: BrandLogoProps) {
  const isLight = variant === "light";
  return (
    <div
      className={`flex shrink-0 items-center justify-center shadow-sm ${sizes[size]} ${
        isLight
          ? "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm"
          : "bg-emerald-700 text-white shadow-emerald-900/20"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </div>
  );
}

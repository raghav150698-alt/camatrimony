import React from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  textColor?: "dark" | "light";
  /** Short section label. Pass `false` to hide. Defaults to brand name for backward compatibility. */
  eyebrow?: string | false;
}

export default function SectionHeading({
  title,
  subtitle,
  centered = true,
  textColor = "dark",
  eyebrow = "CA Matrimony BNCN",
}: SectionHeadingProps) {
  const alignment = centered ? "text-center justify-center" : "text-left justify-start";
  const titleColor = textColor === "dark" ? "text-slate-900 dark:text-white" : "text-white";
  const subtitleColor = textColor === "dark" ? "text-slate-500 dark:text-slate-400" : "text-slate-300";

  return (
    <div className={`flex flex-col mb-12 ${centered ? "items-center" : "items-start"} ${alignment}`}>
      {eyebrow !== false && (
        <span className="text-sm font-bold uppercase tracking-wider text-gold-600 mb-2">
          {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${titleColor}`}>
        {title}
      </h2>
      
      {/* Decorative Traditional Indian Ornament */}
      <div className={`flex items-center gap-3 my-4 ${alignment}`}>
        <div className="h-[1.5px] w-12 bg-gradient-to-r from-transparent to-gold-500" />
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gold-500"
        >
          <path d="M12 2L2 12h10L5 22h10l7-10H12L17 2z" className="hidden" />
          {/* Custom mandala-like floral SVG path */}
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 2a4 4 0 0 1 4 4c0 3-4 6-4 6s-4-3-4-6a4 4 0 0 1 4-4z" />
          <path d="M12 22a4 4 0 0 0 4-4c0-3-4-6-4-6s-4 3-4 6a4 4 0 0 0 4 4z" />
        </svg>
        <div className="h-[1.5px] w-12 bg-gradient-to-l from-transparent to-gold-500" />
      </div>

      {subtitle && (
        <p className={`max-w-2xl text-lg font-light leading-relaxed ${subtitleColor} ${centered ? "text-center" : "text-left"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

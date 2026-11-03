import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "maroon" | "gold";
  size?: "sm" | "md";
  showDot?: boolean;
  onRemove?: () => void;
}

export default function Badge({
  children,
  className = "",
  variant = "neutral",
  size = "md",
  showDot = false,
  onRemove,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1.5 font-medium rounded-full transition-colors border";

  const variants = {
    neutral: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
    warning: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    danger: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400",
    info: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-400",
    maroon: "bg-maroon-50 border-maroon-200 text-maroon-700 dark:bg-maroon-950/30 dark:border-maroon-800 dark:text-maroon-400",
    gold: "bg-gold-50 border-gold-200 text-gold-700 dark:bg-gold-950/30 dark:border-gold-800 dark:text-gold-400",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const dotColors = {
    neutral: "bg-slate-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    maroon: "bg-maroon-500",
    gold: "bg-gold-500",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1.5 rounded-full hover:bg-slate-200/50 p-0.5 inline-flex items-center justify-center transition-colors text-current cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border";

  const variants = {
    primary:
      "bg-maroon-500 hover:bg-maroon-600 active:bg-maroon-700 text-white border-transparent focus:ring-maroon-500 shadow-md hover:shadow-lg active:shadow-sm",
    secondary:
      "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border-transparent focus:ring-slate-400",
    gold: "bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-slate-950 border-transparent focus:ring-gold-500 shadow-md hover:shadow-lg active:shadow-sm",
    outline:
      "bg-transparent hover:bg-maroon-50 dark:hover:bg-maroon-950/30 border-maroon-500 text-maroon-500 dark:text-maroon-400 focus:ring-maroon-500",
    ghost:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent focus:ring-slate-400",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm rounded-full",
    md: "px-6 py-2.5 text-base rounded-full",
    lg: "px-8 py-3.5 text-lg rounded-full",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

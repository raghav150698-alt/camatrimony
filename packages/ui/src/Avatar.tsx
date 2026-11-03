import React, { useState } from "react";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  isVerified?: boolean;
  isOnline?: boolean;
}

export default function Avatar({
  src,
  name,
  size = "md",
  isVerified = false,
  isOnline = false,
  className = "",
  ...props
}: AvatarProps) {
  const [error, setError] = useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizes = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
    "2xl": "w-24 h-24 text-3xl",
  };

  const verifiedSizes = {
    xs: "w-2.5 h-2.5 -right-0.5 -bottom-0.5 border-[1px]",
    sm: "w-3 h-3 -right-0.5 -bottom-0.5 border-[1.5px]",
    md: "w-3.5 h-3.5 -right-0.5 -bottom-0.5 border-2",
    lg: "w-4 h-4 -right-0.5 -bottom-0.5 border-2",
    xl: "w-5 h-5 right-0 bottom-0 border-2",
    "2xl": "w-6 h-6 right-0.5 bottom-0.5 border-2",
  };

  const onlineSizes = {
    xs: "w-2 h-2 -right-0.5 -top-0.5 border-[1px]",
    sm: "w-2.5 h-2.5 -right-0.5 -top-0.5 border-[1.5px]",
    md: "w-3 h-3 -right-0.5 -top-0.5 border-2",
    lg: "w-3 h-3 -right-0.5 -top-0.5 border-2",
    xl: "w-3.5 h-3.5 right-0 top-0 border-2",
    "2xl": "w-5 h-5 right-0.5 top-0.5 border-2",
  };

  return (
    <div className={`relative flex-shrink-0 select-none ${className}`} {...props}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-bold capitalize transition-all duration-300 border border-slate-200/80 dark:border-slate-800 ${
          sizes[size]
        } ${
          src && !error
            ? "bg-slate-100 dark:bg-slate-900"
            : "bg-gradient-to-br from-maroon-500 to-maroon-700 text-white"
        }`}
      >
        {src && !error ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            onError={() => setError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {isOnline && (
        <span
          className={`absolute rounded-full bg-emerald-500 border-white dark:border-slate-900 animate-pulse ${onlineSizes[size]}`}
          title="Online"
        />
      )}

      {isVerified && (
        <span
          className={`absolute rounded-full bg-blue-500 border-white dark:border-slate-900 text-white flex items-center justify-center ${verifiedSizes[size]}`}
          title="Verified Profile"
        >
          <svg className="w-[60%] h-[60%]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.585a2.625 2.625 0 014.954 0 1.066 1.066 0 001.072.766 2.625 2.625 0 012.477 2.477 1.066 1.066 0 00.766 1.072 2.625 2.625 0 010 4.954 1.066 1.066 0 00-.766 1.072 2.625 2.625 0 01-2.477 2.477 1.066 1.066 0 00-1.072.766 2.625 2.625 0 01-4.954 0 1.066 1.066 0 00-1.072-.766 2.625 2.625 0 01-2.477-2.477 1.066 1.066 0 00-.766-1.072 2.625 2.625 0 010-4.954 1.066 1.066 0 00.766-1.072 2.625 2.625 0 012.477-2.477 1.066 1.066 0 001.072-.766zM9 11l3-3m0 0l-4.5 4.5M12 8l-4.5 4.5L6 11"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

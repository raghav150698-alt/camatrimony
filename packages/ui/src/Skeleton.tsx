import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const baseClass = "animate-pulse bg-slate-200 dark:bg-slate-800/80";
  
  const variantClasses = {
    text: "h-3 w-full rounded",
    circle: "rounded-full",
    rectangular: "rounded-2xl",
  };

  const customStyle = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    ...style,
  };

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={customStyle}
      {...props}
    />
  );
}

import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Textarea({
  label,
  error,
  helperText,
  className = "",
  disabled,
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className={`text-sm font-semibold select-none cursor-pointer ${
            disabled
              ? "text-slate-400 dark:text-slate-600"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          id={id}
          disabled={disabled}
          rows={rows}
          className={`w-full rounded-2xl px-4 py-3 bg-white dark:bg-slate-900 border text-slate-900 dark:text-slate-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:bg-slate-50 disabled:dark:bg-slate-950/40 disabled:text-slate-400 disabled:dark:text-slate-600 disabled:cursor-not-allowed ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-200 dark:border-slate-800 focus:border-maroon-500 focus:ring-maroon-500/20"
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-0.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

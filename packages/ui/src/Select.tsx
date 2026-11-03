import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  /** Set to `false` to omit the empty placeholder option (recommended for required fields). */
  placeholder?: string | false;
  /** Visual density — not the native HTML `size` attribute. */
  fieldSize?: "default" | "compact" | "filter";
  labelStyle?: "default" | "wizard" | "filter";
  showRequired?: boolean;
  /** When false, the control sizes to its content (toolbars, inline filters). */
  fullWidth?: boolean;
}

export default function Select({
  label,
  options,
  error,
  helperText,
  className = "",
  disabled,
  id,
  placeholder = "Select an option",
  fieldSize = "default",
  labelStyle = "default",
  showRequired = false,
  fullWidth = true,
  required,
  ...props
}: SelectProps) {
  const isCompact = fieldSize === "compact";
  const isFilter = fieldSize === "filter";
  const isWizardLabel = labelStyle === "wizard";
  const isFilterLabel = labelStyle === "filter";

  const labelClasses = isFilterLabel
    ? `text-[9px] font-bold uppercase tracking-wider block ${
        disabled
          ? "text-slate-400 dark:text-slate-600"
          : "text-slate-400 dark:text-slate-500"
      }`
    : isWizardLabel
      ? `text-xs font-bold uppercase tracking-wide ${
          disabled
            ? "text-slate-400 dark:text-slate-600"
            : "text-slate-500 dark:text-slate-400"
        }`
      : `text-sm font-semibold select-none cursor-pointer ${
          disabled
            ? "text-slate-400 dark:text-slate-600"
            : "text-slate-700 dark:text-slate-300"
        }`;

  const selectClasses = isFilter
    ? "rounded-xl px-3.5 pr-10 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 dark:[color-scheme:dark] shadow-sm hover:border-maroon-300/70 dark:hover:border-maroon-700/60"
    : isCompact
      ? "rounded-xl px-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 dark:[color-scheme:dark] shadow-sm hover:border-maroon-300/70 dark:hover:border-maroon-700/60"
      : "rounded-2xl px-4 pr-10 py-3 text-sm bg-white dark:bg-slate-900 dark:[color-scheme:dark] shadow-sm hover:border-maroon-300/70 dark:hover:border-maroon-700/60";

  return (
    <div
      className={`flex flex-col ${fullWidth ? "w-full" : "w-auto shrink-0"} ${isFilter || isCompact ? "gap-1.5" : "gap-2"}`}
    >
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
          {(showRequired || required) && (
            <span className="text-maroon-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative flex items-center group">
        <select
          id={id}
          disabled={disabled}
          required={required}
          className={`${fullWidth ? "w-full" : "w-auto min-w-[10rem]"} border text-slate-900 dark:text-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-maroon-500/50 focus:border-maroon-500/50 dark:focus:border-maroon-500/50 appearance-none [-webkit-appearance:none] bg-no-repeat disabled:bg-slate-100 disabled:dark:bg-slate-950/40 disabled:text-slate-400 disabled:dark:text-slate-600 disabled:cursor-not-allowed cursor-pointer ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-200 dark:border-slate-700"
          } ${selectClasses} ${className}`}
          {...props}
        >
          {placeholder !== false && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div
          className={`${isFilter ? "right-3" : "right-3.5"} pointer-events-none absolute flex items-center justify-center transition-colors ${
            disabled
              ? "text-slate-300 dark:text-slate-600"
              : "text-slate-400 dark:text-slate-500 group-hover:text-maroon-500 group-focus-within:text-maroon-500"
          }`}
        >
          <ChevronDown
            className={isFilter ? "w-4 h-4" : isCompact ? "w-4 h-4" : "w-[18px] h-[18px]"}
            strokeWidth={2.25}
          />
        </div>
      </div>
      {error ? (
        <span className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-0.5">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</span>
      ) : null}
    </div>
  );
}

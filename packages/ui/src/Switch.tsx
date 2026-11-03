import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  /** Accessible name for the toggle, used when no visible label is rendered. */
  ariaLabel?: string;
}

export default function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
  ariaLabel,
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col gap-0.5 select-none cursor-pointer" onClick={handleToggle}>
          {label && (
            <span
              className={`text-sm font-semibold ${
                disabled
                  ? "text-slate-400 dark:text-slate-600"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-maroon-500" : "bg-slate-200 dark:bg-slate-800"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "gold";
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export default function DropdownMenu({
  trigger,
  items,
  align = "right",
  className = "",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = align === "right" ? "right-0" : "left-0";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger element */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Menu overlay */}
      {isOpen && (
        <div
          className={`absolute ${alignClasses} mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 overflow-hidden transform origin-top-right transition-all duration-300 py-1.5 focus:outline-none`}
        >
          {items.map((item, idx) => {
            const isDanger = item.variant === "danger";
            const isGold = item.variant === "gold";

            const hoverStyles = isDanger
              ? "hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400"
              : isGold
              ? "hover:bg-gold-50 dark:hover:bg-gold-950/20 text-gold-600 dark:text-gold-400"
              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200";

            return (
              <button
                key={item.id || idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors duration-300 text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${hoverStyles}`}
              >
                {item.icon && <span className="text-current flex-shrink-0">{item.icon}</span>}
                <span className="flex-grow">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

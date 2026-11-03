import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className = "",
}: TabsProps) {
  const containerClasses =
    variant === "underline"
      ? "flex border-b border-slate-100 dark:border-slate-800"
      : "flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl";

  const tabClasses = (isActive: boolean) => {
    if (variant === "underline") {
      return `flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-all duration-300 relative cursor-pointer ${
        isActive
          ? "border-maroon-500 text-maroon-600 dark:text-maroon-400"
          : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      }`;
    } else {
      return `flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
        isActive
          ? "bg-white dark:bg-slate-950 text-maroon-600 dark:text-maroon-400 shadow-sm border border-slate-200/50 dark:border-slate-800/50"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      }`;
    }
  };

  return (
    <div className={`overflow-x-auto scrollbar-none ${className}`}>
      <div className={containerClasses}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={tabClasses(isActive)}
            >
              {tab.icon && <span className="text-current">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== "" && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-maroon-50 text-maroon-600 dark:bg-maroon-950/30 dark:text-maroon-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

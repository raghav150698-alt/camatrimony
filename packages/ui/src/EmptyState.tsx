import React from "react";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 max-w-lg mx-auto ${className}`}>
      <div className="p-4 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 mb-5 flex items-center justify-center">
        {icon || (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2m14 0h-2m-8 0H6m8 0a2 2 0 002 2h2a2 2 0 002-2M8 21h8" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-5">
          {actionText}
        </Button>
      )}
    </div>
  );
}

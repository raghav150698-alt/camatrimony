import React from "react";
import { Card, CardBody } from "./Card";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  description?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  description,
  loading = false,
  className = "",
  ...props
}: StatCardProps) {
  return (
    <Card hoverEffect className={`overflow-hidden ${className}`} {...props}>
      <CardBody className="flex flex-col justify-between h-full">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                  {title}
                </p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1.5 tracking-tight">
                  {value}
                </h4>
              </div>
              {icon && (
                <div className="p-3 bg-maroon-50 dark:bg-maroon-950/20 text-maroon-500 dark:text-maroon-400 rounded-2xl flex items-center justify-center">
                  {icon}
                </div>
              )}
            </div>

            {(trend || description) && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40">
                {trend && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      trend.isPositive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      {trend.isPositive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      )}
                    </svg>
                    {trend.value}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {trend?.label || description}
                </span>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

import React from "react";
import Select from "./Select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show before and after current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 select-none ${className}`}>
      {/* Items status summary */}
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Showing <span className="text-slate-800 dark:text-slate-200">{startIdx}</span> to{" "}
        <span className="text-slate-800 dark:text-slate-200">{endIdx}</span> of{" "}
        <span className="text-slate-800 dark:text-slate-200">{totalItems}</span> results
      </div>

      {/* Pages selector */}
      <div className="flex items-center gap-4 flex-wrap">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>Rows:</span>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              options={pageSizeOptions.map((opt) => ({ label: String(opt), value: opt }))}
              placeholder={false}
              fieldSize="filter"
              className="font-bold min-w-[4.5rem]"
            />
          </div>
        )}

        <nav className="inline-flex rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5" aria-label="Pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-3 py-1.5 text-sm font-bold text-slate-400 select-none flex items-center justify-center"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                onClick={() => onPageChange(pageNum)}
                className={`px-3.5 py-1.5 text-sm font-bold rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-maroon-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}

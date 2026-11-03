import React from "react";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnKey: string) => void;
  // Row selection options
  selectedRows?: Set<string | number>;
  onSelectRow?: (rowId: string | number) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  sortColumn,
  sortDirection,
  onSort,
  selectedRows,
  onSelectRow,
  onSelectAll,
  getRowId,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no items in this list.",
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (col.sortable && onSort) {
      onSort(col.key);
    }
  };

  const isRowSelected = (row: T) => {
    if (!selectedRows || !getRowId) return false;
    return selectedRows.has(getRowId(row));
  };

  const allRowsSelected =
    data.length > 0 && selectedRows && getRowId && selectedRows.size === data.length;

  return (
    <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm flex flex-col">
      <div className="w-full overflow-x-auto scrollbar-none">
        <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 select-none">
            <tr>
              {onSelectAll && selectedRows && (
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    onChange={onSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-maroon-500 focus:ring-maroon-500/20 w-4 h-4 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    className={`px-6 py-4 font-bold ${
                      col.sortable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40" : ""
                    } ${col.className || ""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && onSort && (
                        <span className="text-slate-400 dark:text-slate-500">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-600 dark:text-slate-300">
            {loading ? (
              // Loader state
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`} className="bg-white dark:bg-slate-900">
                  {onSelectAll && selectedRows && (
                    <td className="px-6 py-4 w-12 text-center">
                      <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mx-auto" />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="px-6 py-4">
                      <Skeleton variant="text" width={cIdx === 0 ? "70%" : "45%"} height={14} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr className="bg-white dark:bg-slate-900">
                <td colSpan={columns.length + (onSelectAll ? 1 : 0)} className="py-12 px-6">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              // Actual content row render
              data.map((row, rIdx) => {
                const isSelected = isRowSelected(row);
                return (
                  <tr
                    key={getRowId ? getRowId(row) : rIdx}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300 ${
                      isSelected ? "bg-maroon-50/10 dark:bg-maroon-950/5" : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    {onSelectRow && getRowId && selectedRows && (
                      <td className="px-6 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(getRowId(row))}
                          className="rounded border-slate-300 dark:border-slate-700 text-maroon-500 focus:ring-maroon-500/20 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td key={col.key} className={`px-6 py-4 text-sm ${col.className || ""}`}>
                        {col.render ? (
                          col.render(row, rIdx)
                        ) : (
                          <span className="truncate block max-w-[200px] sm:max-w-[240px]">
                            {(row as Record<string, unknown>)[col.key] as React.ReactNode}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

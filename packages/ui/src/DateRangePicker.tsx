import React from "react";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  label?: string;
  className?: string;
}

export default function DateRangePicker({
  value,
  onChange,
  label = "Select Date Range",
  className = "",
}: DateRangePickerProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, startDate: e.target.value });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, endDate: e.target.value });
  };

  const setPreset = (presetName: "today" | "week" | "month" | "all") => {
    const today = new Date();
    const start = new Date();

    if (presetName === "today") {
      // today
    } else if (presetName === "week") {
      start.setDate(today.getDate() - 7);
    } else if (presetName === "month") {
      start.setDate(today.getDate() - 30);
    } else if (presetName === "all") {
      onChange({ startDate: "", endDate: "" });
      return;
    }

    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    onChange({
      startDate: formatDate(start),
      endDate: formatDate(today),
    });
  };

  return (
    <div className={`flex flex-col gap-2 w-full select-none ${className}`}>
      {label && <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Date pickers */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 flex-grow w-full sm:w-auto">
          <input
            type="date"
            value={value.startDate}
            onChange={handleStartDateChange}
            className="bg-transparent border-none text-slate-800 dark:text-slate-200 text-sm font-semibold focus:outline-none w-full cursor-pointer focus:ring-0"
          />
          <span className="text-slate-400 text-xs font-bold uppercase select-none">to</span>
          <input
            type="date"
            value={value.endDate}
            onChange={handleEndDateChange}
            className="bg-transparent border-none text-slate-800 dark:text-slate-200 text-sm font-semibold focus:outline-none w-full cursor-pointer focus:ring-0"
          />
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          {(["today", "week", "month", "all"] as const).map((p) => {
            const labels = { today: "1D", week: "7D", month: "30D", all: "All" };
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-900 transition-colors cursor-pointer"
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

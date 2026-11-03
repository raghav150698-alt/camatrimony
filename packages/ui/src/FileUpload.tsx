import React, { useRef, useState } from "react";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
  error?: string;
}

export default function FileUpload({
  onFileSelect,
  accept = "image/*,application/pdf",
  multiple = false,
  maxSizeMB = 5,
  label = "Upload files",
  error,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    setFileError(null);

    const validFiles: File[] = [];
    const names: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setFileError(`File "${file.name}" exceeds the maximum ${maxSizeMB}MB limit.`);
        return;
      }

      validFiles.push(file);
      names.push(file.name);

      if (!multiple) break; // If single file upload, stop after first file
    }

    if (validFiles.length > 0) {
      setSelectedFileNames(names);
      onFileSelect(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const disabled = false;

  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      {label && <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
        className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 min-h-[140px] bg-slate-50/40 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/30 ${
          isDragOver
            ? "border-maroon-500 bg-maroon-50/20 dark:bg-maroon-950/10 scale-[1.01]"
            : error || fileError
            ? "border-rose-300 dark:border-rose-800"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => processFiles(e.target.files)}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Drag & drop or <span className="text-maroon-500 font-bold hover:underline cursor-pointer">browse</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Supports image files and PDFs up to {maxSizeMB}MB
        </p>

        {selectedFileNames.length > 0 && (
          <div className="mt-4 w-full max-w-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center gap-2 shadow-sm animate-fade-in mx-auto">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate flex-grow text-left">
              {multiple ? `${selectedFileNames.length} files selected` : selectedFileNames[0]}
            </span>
          </div>
        )}
      </div>

      {(error || fileError) && (
        <span className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-0.5 animate-slide-in">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error || fileError}
        </span>
      )}
    </div>
  );
}

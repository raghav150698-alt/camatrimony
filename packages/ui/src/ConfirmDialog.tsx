import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "gold";
  loading?: boolean;
  /** Optional extra content below the message (e.g. custom fields). */
  children?: React.ReactNode;
  /** When true, shows a required reason input and disables confirm until filled. */
  reasonRequired?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonValue?: string;
  onReasonChange?: (value: string) => void;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  children,
  reasonRequired = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter a reason…",
  reasonValue = "",
  onReasonChange,
}: ConfirmDialogProps) {
  const reasonMissing = reasonRequired && !reasonValue.trim();

  const footer = (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button
        variant={variant === "danger" ? "primary" : variant === "gold" ? "gold" : "primary"}
        className={variant === "danger" ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white" : ""}
        size="sm"
        onClick={onConfirm}
        loading={loading}
        disabled={reasonMissing}
      >
        {confirmText}
      </Button>
    </>
  );

  const icons = {
    danger: (
      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex-shrink-0 flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    primary: (
      <div className="p-3 bg-maroon-50 dark:bg-maroon-950/20 text-maroon-500 rounded-full flex-shrink-0 flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    gold: (
      <div className="p-3 bg-gold-50 dark:bg-gold-950/20 text-gold-500 rounded-full flex-shrink-0 flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
    ),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md" footer={footer}>
      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        {icons[variant]}
        <div className="flex-grow text-center sm:text-left w-full space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {message}
          </p>
          {reasonRequired && (
            <Input
              label={reasonLabel}
              value={reasonValue}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder={reasonPlaceholder}
              required
            />
          )}
          {children}
        </div>
      </div>
    </Modal>
  );
}

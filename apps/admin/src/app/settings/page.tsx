"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { Button, Input, DataTable, Switch, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface SettingsResponse {
  success: boolean;
  settings?: Record<string, string>;
  error?: string;
  message?: string;
}

interface SettingsSaveResponse {
  success: boolean;
  error?: string;
  message?: string;
}

interface SettingRow {
  key: string;
  value: string;
}

function AdminSettingsPageInner() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = (await adminApi.client.get("/admin/settings")) as SettingsResponse;
      if (response.success && response.settings) {
        const withDefaults = {
          razorpay_enabled: "0",
          manual_payment_enabled: "1",
          upi_id: "",
          upi_qr_url: "",
          payment_instructions:
            "Pay via UPI to the ID shown below. Upload your payment screenshot for admin verification.",
          bank_account_details: "",
          astrology_match_enabled: "1",
          ...response.settings,
        };
        setSettings(withDefaults);
        setForm(withDefaults);
      } else {
        setError(response.error || "Failed to load settings");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    setForm((prev) => ({ ...prev, [key]: newValue }));
    setNewKey("");
    setNewValue("");
  };

  const handleSave = async () => {
    const changes: Record<string, string> = {};
    Object.entries(form).forEach(([key, value]) => {
      if (settings[key] !== value || !(key in settings)) {
        changes[key] = value;
      }
    });

    if (Object.keys(changes).length === 0) {
      showToast("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const response = (await adminApi.client.patch("/admin/settings", changes)) as SettingsSaveResponse;
      if (response.success) {
        showToast(response.message || "Settings saved", "success");
        setSettings(form);
      } else {
        showToast(response.error || "Failed to save settings", "error");
      }
    } catch (err) {
      console.error("Save settings failed:", err);
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const rows: SettingRow[] = useMemo(
    () => Object.entries(form).map(([key, value]) => ({ key, value })),
    [form]
  );

  const columns: Column<SettingRow>[] = [
    {
      key: "key",
      header: "Setting Key",
      render: (row) => <span className="font-semibold text-sm">{row.key}</span>,
    },
    {
      key: "value",
      header: "Value",
      render: (row) => (
        <Input
          value={row.value}
          onChange={(e) => handleChange(row.key, e.target.value)}
          className="py-1.5 text-sm"
          placeholder="Enter value..."
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            System Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Update global platform configuration key/value pairs.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={handleSave} loading={saving} type="button">
          Save Changes
        </Button>
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Payments
        </h3>
        <Switch
          checked={form.razorpay_enabled === "1" || form.razorpay_enabled === "true"}
          onChange={(checked) => handleChange("razorpay_enabled", checked ? "1" : "0")}
          label="Enable Razorpay checkout"
          description="When off, checkout shows UPI/bank instructions + payment proof upload for admin confirmation."
        />
        <Switch
          checked={form.manual_payment_enabled === "1" || form.manual_payment_enabled === "true"}
          onChange={(checked) => handleChange("manual_payment_enabled", checked ? "1" : "0")}
          label="Enable manual UPI / bank payment"
          description="Show manual payment instructions even if Razorpay is also on."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="UPI ID (shown on member checkout)"
            value={form.upi_id || ""}
            onChange={(e) => handleChange("upi_id", e.target.value)}
            placeholder="merchant@upi — leave empty until ready"
            className="py-2.5 rounded-xl"
          />
          <Input
            label="UPI QR image URL (optional)"
            value={form.upi_qr_url || ""}
            onChange={(e) => handleChange("upi_qr_url", e.target.value)}
            placeholder="https://… public image of your QR"
            className="py-2.5 rounded-xl"
          />
        </div>
        <Input
          label="Payment instructions (shown on checkout)"
          value={form.payment_instructions || ""}
          onChange={(e) => handleChange("payment_instructions", e.target.value)}
          placeholder="e.g. Pay to the UPI ID below, then upload screenshot"
          className="py-2.5 rounded-xl"
        />
        <Input
          label="Bank account details (optional, shown on checkout)"
          value={form.bank_account_details || ""}
          onChange={(e) => handleChange("bank_account_details", e.target.value)}
          placeholder="Bank / account / IFSC — leave empty if using UPI only"
          className="py-2.5 rounded-xl"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Astrology
        </h3>
        <Switch
          checked={form.astrology_match_enabled === "1" || form.astrology_match_enabled === "true"}
          onChange={(checked) => handleChange("astrology_match_enabled", checked ? "1" : "0")}
          label="Show astrology match % on dashboard"
          description="Simple indicative scorer for Hindu profiles (rasi / nakshatra / manglik). Not a certified Vedic report."
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyTitle="No settings found"
        emptyDescription="There are no system settings configured yet."
      />

      <form
        onSubmit={handleAddNew}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Add New Setting
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <Input
            label="New Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="e.g. support_email"
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Input
            label="New Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Button variant="outline" size="sm" type="submit">
            Add Setting
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminSettingsPageInner />
    </Suspense>
  );
}

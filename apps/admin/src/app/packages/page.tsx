"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, DataTable, Badge, Modal, ConfirmDialog, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

const emptyPackage = {
  name: "",
  price: "",
  validityDays: "",
  contactLimit: "",
  chatAllowed: true,
  isActive: true,
  isCustom: false,
  features: "",
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyPackage);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.packages();
      if (data.success) {
        setPackages(data.packages || data.data?.packages || []);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
      showToast("Failed to load packages", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPackage);
    setModalOpen(true);
  };

  const openEdit = (pkg: any) => {
    setEditing(pkg);
    setForm({
      name: pkg.name || "",
      price: String(pkg.price || ""),
      validityDays: String(pkg.validityDays || pkg.validity_days || ""),
      contactLimit: String(pkg.contactLimit || pkg.contact_limit || ""),
      chatAllowed: pkg.chatAllowed || pkg.chat_allowed ? true : false,
      isActive: pkg.isActive || pkg.is_active ? true : false,
      isCustom: pkg.isCustom || pkg.is_custom ? true : false,
      features: Array.isArray(pkg.features) ? pkg.features.join(", ") : pkg.features || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        validityDays: Number(form.validityDays),
        contactLimit: Number(form.contactLimit),
        chatAllowed: form.chatAllowed,
        isActive: form.isActive,
        isCustom: form.isCustom,
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      };

      if (editing) {
        const data = await adminApi.updatePackage(editing.id, payload);
        if (data.success) {
          showToast("Package updated successfully");
          setModalOpen(false);
          loadPackages();
        } else {
          showToast(data.error || "Failed to update package", "error");
        }
      } else {
        const data = await adminApi.createPackage(payload);
        if (data.success) {
          showToast("Package created successfully");
          setModalOpen(false);
          loadPackages();
        } else {
          showToast(data.error || "Failed to create package", "error");
        }
      }
    } catch (err) {
      console.error("Package save failed:", err);
      showToast("Failed to save package", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const data = await adminApi.deletePackage(deleteTarget.id);
      if (data.success) {
        showToast("Package deleted successfully");
        setPackages(packages.filter((p) => p.id !== deleteTarget.id));
      } else {
        showToast(data.error || "Failed to delete package", "error");
      }
    } catch (err) {
      console.error("Package delete failed:", err);
      showToast("Failed to delete package", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const columns: Column<any>[] = [
    { key: "name", header: "Name" },
    {
      key: "price",
      header: "Price",
      render: (row: any) => <span className="font-bold">₹{Number(row.price || 0).toLocaleString("en-IN")}</span>,
    },
    {
      key: "validity",
      header: "Validity",
      render: (row: any) => <span>{row.validityDays || row.validity_days || 0} days</span>,
    },
    {
      key: "contactLimit",
      header: "Contact Limit",
      render: (row: any) => <span>{row.contactLimit || row.contact_limit || 0}</span>,
    },
    {
      key: "chat",
      header: "Chat",
      render: (row: any) =>
        row.chatAllowed || row.chat_allowed ? (
          <Badge variant="success" size="sm">Yes</Badge>
        ) : (
          <Badge variant="neutral" size="sm">No</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) =>
        row.isActive || row.is_active ? (
          <Badge variant="success" size="sm">Active</Badge>
        ) : (
          <Badge variant="neutral" size="sm">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setDeleteTarget(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Subscription Packages</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create and manage membership plans, pricing, validity, and contact limits.
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          + New Package
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={packages}
        loading={loading}
        emptyTitle="No packages found"
        emptyDescription="Create your first subscription package to start selling memberships."
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Package" : "Create Package"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSubmit} loading={formLoading}>
              {editing ? "Update Package" : "Create Package"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Package Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Price (INR)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <Input
              label="Validity (Days)"
              type="number"
              value={form.validityDays}
              onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
              required
            />
            <Input
              label="Contact Unlock Limit"
              type="number"
              value={form.contactLimit}
              onChange={(e) => setForm({ ...form, contactLimit: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Chat Allowed"
              options={[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ]}
              value={form.chatAllowed ? "true" : "false"}
              onChange={(e) => setForm({ ...form, chatAllowed: e.target.value === "true" })}
            />
            <Select
              label="Status"
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
              value={form.isActive ? "true" : "false"}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
            />
            <Select
              label="Custom Plan"
              options={[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              value={form.isCustom ? "true" : "false"}
              onChange={(e) => setForm({ ...form, isCustom: e.target.value === "true" })}
            />
          </div>
          <Input
            label="Features (comma-separated)"
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
            helperText="e.g. Unlimited Profiles, Priority Listing, Assisted Mediation"
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Package"
        message={`Are you sure you want to delete the package "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

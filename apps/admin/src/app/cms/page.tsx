"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import {
  Button,
  Input,
  Textarea,
  DataTable,
  Modal,
  ConfirmDialog,
  type Column,
} from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface SuccessStory {
  id: number | string;
  bride_name?: string;
  groom_name?: string;
  wedding_date?: string;
  description?: string;
  image_url?: string;
  is_featured?: number | boolean;
  location?: string;
  created_at?: string;
}

interface BrandingSetting {
  key: string;
  value: string;
}

interface CmsResponse {
  success: boolean;
  settings?: Record<string, string>;
  successStories?: SuccessStory[];
  error?: string;
  message?: string;
}

interface CmsActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const emptyStory = {
  brideName: "",
  groomName: "",
  weddingDate: "",
  description: "",
  image: "",
};

function AdminCmsPageInner() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyForm, setStoryForm] = useState(emptyStory);
  const [storySaving, setStorySaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SuccessStory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [brandingForm, setBrandingForm] = useState<BrandingSetting>({ key: "", value: "" });
  const [brandingSaving, setBrandingSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCms = useCallback(async () => {
    setLoading(true);
    try {
      const response = (await adminApi.cms()) as CmsResponse;
      if (response.success) {
        setSettings(response.settings || {});
        setStories(response.successStories || []);
      } else {
        showToast(response.error || "Failed to load CMS", "error");
      }
    } catch (err) {
      console.error("Failed to load CMS:", err);
      showToast("Failed to load CMS", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCms();
  }, [loadCms]);

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.brideName.trim() || !storyForm.groomName.trim() || !storyForm.description.trim()) {
      showToast("Bride name, groom name, and description are required.", "error");
      return;
    }
    setStorySaving(true);
    try {
      const response = (await adminApi.cmsAction({
        action: "addStory",
        brideName: storyForm.brideName.trim(),
        groomName: storyForm.groomName.trim(),
        weddingDate: storyForm.weddingDate,
        description: storyForm.description.trim(),
        image: storyForm.image.trim(),
      })) as CmsActionResponse;

      if (response.success) {
        showToast(response.message || "Success story added", "success");
        setStoryModalOpen(false);
        setStoryForm(emptyStory);
        await loadCms();
      } else {
        showToast(response.error || "Failed to add success story", "error");
      }
    } catch (err) {
      console.error("Add story failed:", err);
      showToast("Failed to add success story", "error");
    } finally {
      setStorySaving(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = (await adminApi.cmsAction({
        action: "deleteStory",
        storyId: deleteTarget.id,
      })) as CmsActionResponse;

      if (response.success) {
        showToast(response.message || "Success story deleted", "success");
        setStories(stories.filter((s) => s.id !== deleteTarget.id));
      } else {
        showToast(response.error || "Failed to delete success story", "error");
      }
    } catch (err) {
      console.error("Delete story failed:", err);
      showToast("Failed to delete success story", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const openEditBranding = (key: string, value: string) => {
    setBrandingForm({ key, value });
    setBrandingModalOpen(true);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingForm.key.trim()) return;
    setBrandingSaving(true);
    try {
      const response = (await adminApi.cmsAction({
        action: "saveConfig",
        key: brandingForm.key.trim(),
        value: brandingForm.value,
      })) as CmsActionResponse;

      if (response.success) {
        showToast(response.message || "Branding updated", "success");
        setBrandingModalOpen(false);
        setSettings((prev) => ({ ...prev, [brandingForm.key]: brandingForm.value }));
      } else {
        showToast(response.error || "Failed to update branding", "error");
      }
    } catch (err) {
      console.error("Save branding failed:", err);
      showToast("Failed to update branding", "error");
    } finally {
      setBrandingSaving(false);
    }
  };

  const settingList: BrandingSetting[] = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
  }));

  const settingColumns: Column<BrandingSetting>[] = [
    { key: "key", header: "Setting Key" },
    {
      key: "value",
      header: "Value",
      render: (row) => (
        <span className="truncate max-w-xs block" title={row.value}>
          {row.value || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => openEditBranding(row.key, row.value)}>
          Edit
        </Button>
      ),
    },
  ];

  const storyColumns: Column<SuccessStory>[] = [
    {
      key: "couple",
      header: "Couple",
      render: (row) => (
        <span className="font-semibold">
          {row.bride_name || "-"} & {row.groom_name || "-"}
        </span>
      ),
    },
    {
      key: "weddingDate",
      header: "Wedding Date",
      render: (row) => (
        <span>{row.wedding_date ? new Date(row.wedding_date).toLocaleDateString() : "-"}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="truncate max-w-md block" title={row.description}>
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <a
              href={row.image_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-maroon-600 hover:underline font-semibold"
            >
              Image
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-500"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        </div>
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
            CMS - Branding & Success Stories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage site branding settings and publish couple success stories.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setStoryModalOpen(true)}>
          + Add Story
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Branding Settings
        </h3>
        <DataTable
          columns={settingColumns}
          data={settingList}
          loading={loading}
          emptyTitle="No branding settings"
          emptyDescription="Branding configuration entries will appear here."
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Success Stories
        </h3>
        <DataTable
          columns={storyColumns}
          data={stories}
          loading={loading}
          emptyTitle="No success stories"
          emptyDescription="Add the first success story to showcase on the site."
        />
      </section>

      <Modal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        title="Add Success Story"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setStoryModalOpen(false)} disabled={storySaving}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleAddStory} loading={storySaving}>
              Save Story
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddStory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bride Name"
              value={storyForm.brideName}
              onChange={(e) => setStoryForm({ ...storyForm, brideName: e.target.value })}
              required
            />
            <Input
              label="Groom Name"
              value={storyForm.groomName}
              onChange={(e) => setStoryForm({ ...storyForm, groomName: e.target.value })}
              required
            />
            <Input
              label="Wedding Date"
              type="date"
              value={storyForm.weddingDate}
              onChange={(e) => setStoryForm({ ...storyForm, weddingDate: e.target.value })}
            />
            <Input
              label="Image URL"
              value={storyForm.image}
              onChange={(e) => setStoryForm({ ...storyForm, image: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <Textarea
            label="Description"
            value={storyForm.description}
            onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
            required
          />
        </form>
      </Modal>

      <Modal
        isOpen={brandingModalOpen}
        onClose={() => setBrandingModalOpen(false)}
        title={brandingForm.key ? `Edit ${brandingForm.key}` : "Update Branding"}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBrandingModalOpen(false)}
              disabled={brandingSaving}
            >
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleSaveBranding} loading={brandingSaving}>
              Save Setting
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveBranding} className="space-y-4">
          <Input
            label="Setting Key"
            value={brandingForm.key}
            onChange={(e) => setBrandingForm({ ...brandingForm, key: e.target.value })}
            required
          />
          <Textarea
            label="Setting Value"
            value={brandingForm.value}
            onChange={(e) => setBrandingForm({ ...brandingForm, value: e.target.value })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStory}
        title="Delete Success Story"
        message="Are you sure you want to delete this success story? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

export default function AdminCmsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminCmsPageInner />
    </Suspense>
  );
}

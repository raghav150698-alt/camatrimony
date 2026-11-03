"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, Button, Badge, Card, CardBody, Modal, Select, Textarea, Input, EmptyState, ConfirmDialog, type TabItem } from "@camatrimony/ui";
import { adminApi, resolveMediaUrl } from "@/lib/admin-api-client";

export default function AdminPhotosPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [visibilityReason, setVisibilityReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [visibilityModal, setVisibilityModal] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [password, setPassword] = useState("");
  const [deletePhoto, setDeletePhoto] = useState<any | null>(null);
  const [approvePhoto, setApprovePhoto] = useState<any | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.photos({ status: activeTab });
      if (data.success) {
        setPhotos(data.photos || data.data?.photos || []);
      }
    } catch (err) {
      console.error("Failed to load photos:", err);
      showToast("Failed to load photos", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const getImageUrl = (photo: any) => {
    if (!photo.file_url) return null;
    return resolveMediaUrl(photo.file_url) || null;
  };

  const confirmApprove = (photo: any) => setApprovePhoto(photo);

  const handleApprove = async () => {
    if (!approvePhoto) return;
    const photo = approvePhoto;
    setActionLoading(true);
    try {
      const data = await adminApi.approvePhoto(photo.id);
      if (data.success) {
        showToast("Photo approved");
        setPhotos(photos.filter((p) => p.id !== photo.id));
      } else {
        showToast(data.error || "Approve failed", "error");
      }
    } catch (err) {
      showToast("Approve failed", "error");
    } finally {
      setActionLoading(false);
      setApprovePhoto(null);
    }
  };

  const handleReject = async (photo: any) => {
    if (!rejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      const data = await adminApi.rejectPhoto(photo.id, rejectionReason);
      if (data.success) {
        showToast("Photo rejected");
        setPhotos(photos.filter((p) => p.id !== photo.id));
        setSelectedPhoto(null);
        setRejectionReason("");
      } else {
        showToast(data.error || "Reject failed", "error");
      }
    } catch (err) {
      showToast("Reject failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = (photo: any) => setDeletePhoto(photo);

  const handleDelete = async () => {
    if (!deletePhoto) return;
    const photo = deletePhoto;
    setActionLoading(true);
    try {
      const data = await adminApi.deletePhoto(photo.id);
      if (data.success) {
        showToast("Photo deleted");
        setPhotos(photos.filter((p) => p.id !== photo.id));
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (err) {
      showToast("Delete failed", "error");
    } finally {
      setActionLoading(false);
      setDeletePhoto(null);
    }
  };

  const openVisibility = (photo: any) => {
    setSelectedPhoto(photo);
    setVisibility(photo.visibility || "public");
    setPassword("");
    setVisibilityModal(true);
  };

  const handleVisibilityUpdate = async () => {
    if (!selectedPhoto) return;
    setActionLoading(true);
    try {
      const data = await adminApi.updatePhotoVisibility(selectedPhoto.id, visibility, password || undefined);
      if (data.success) {
        showToast("Photo visibility updated");
        setPhotos(photos.map((p) => (p.id === selectedPhoto.id ? { ...p, visibility } : p)));
        setVisibilityModal(false);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (err) {
      showToast("Update failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: TabItem[] = [
    { id: "pending", label: "Pending", badge: activeTab === "pending" ? photos.length : undefined },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
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

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Photo Moderation</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Review, approve, reject, and manage photo visibility for all member profiles.
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-400 font-bold">Loading photo queue...</span>
        </div>
      ) : photos.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            title="No photos in this queue"
            description="There are currently no photos to moderate in this status."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {photos.map((photo) => {
            const imageUrl = getImageUrl(photo);
            return (
              <Card key={photo.id} className="overflow-hidden h-full">
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Member photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      No image URL
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant={photo.status === "pending" ? "warning" : photo.status === "approved" ? "success" : "danger"} size="sm">
                      {photo.status}
                    </Badge>
                  </div>
                </div>
                <CardBody className="space-y-3">
                  <div className="text-xs text-slate-500">
                    <p><span className="font-semibold">User:</span> {photo.user_email || photo.user_id}</p>
                    <p><span className="font-semibold">Visibility:</span> {photo.visibility || "public"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {photo.status === "pending" && (
                      <>
                        <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 border-transparent" onClick={() => confirmApprove(photo)} disabled={actionLoading}>
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPhoto(photo); setRejectionReason(""); }}>
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openVisibility(photo)}>
                      Visibility
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => confirmDelete(photo)}>
                      Delete
                    </Button>
                  </div>

                  {selectedPhoto?.id === photo.id && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection"
                        className="text-xs"
                      />
                      <Button variant="primary" size="sm" fullWidth className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 border-transparent" onClick={() => handleReject(photo)} loading={actionLoading}>
                        Confirm Reject
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!approvePhoto}
        onClose={() => setApprovePhoto(null)}
        onConfirm={handleApprove}
        title="Approve Photo?"
        message="This will mark the photo as approved and make it visible according to its visibility settings."
        confirmText="Approve"
        cancelText="Cancel"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!deletePhoto}
        onClose={() => setDeletePhoto(null)}
        onConfirm={handleDelete}
        title="Delete Photo"
        message="Are you sure you want to permanently delete this photo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />

      <Modal
        isOpen={visibilityModal}
        onClose={() => setVisibilityModal(false)}
        title="Photo Visibility"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setVisibilityModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleVisibilityUpdate} loading={actionLoading}>
              Update
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Visibility"
            options={[
              { label: "Public", value: "public" },
              { label: "Members Only", value: "members_only" },
              { label: "Private", value: "private" },
              { label: "Password Protected", value: "password_protected" },
            ]}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          />
          {visibility === "password_protected" && (
            <Input
              label="Photo password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set photo password"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

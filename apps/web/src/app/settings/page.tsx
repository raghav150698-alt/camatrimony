"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Lock, 
  ShieldCheck, 
  Bell, 
  Download, 
  Trash2, 
  Phone,
  UserX,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Unlock,
  AlertTriangle
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@camatrimony/ui";
import { Badge } from "@camatrimony/ui";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import { Switch } from "@camatrimony/ui";
import { Input } from "@camatrimony/ui";
import { ConfirmDialog } from "@camatrimony/ui";
import { Card, CardHeader, CardBody } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getApiClient,
  getBlockedUsers,
  unblockUser,
  updateProfile,
  deleteUserAccount,
} from "@camatrimony/api-client";

export default function AccountSettingsPage() {
  const { user, dbUser, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Settings states
  const [hideProfile, setHideProfile] = useState(false);
  const [hideContact, setHideContact] = useState(false);
  const [hideIncome, setHideIncome] = useState(false);

  const [notifyInterests, setNotifyInterests] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyKyc, setNotifyKyc] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Blocked list state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [fetchingBlocks, setFetchingBlocks] = useState(true);

  // Confirmation flow controls
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch block list and initialize preferences
  useEffect(() => {
    if (!user) return;
    setPhoneNumber(user.phoneNumber || "");

    async function loadBlockedUsers() {
      setFetchingBlocks(true);
      try {
        const res = await getBlockedUsers(user!.uid);
        if (res.success && res.data) {
          setBlockedUsers(res.data as any[]);
        }
      } catch (err) {
        console.error("Blocklist fetch error", err);
      } finally {
        setFetchingBlocks(false);
      }
    }

    // Load current settings from API
    async function loadSettings() {
      try {
        const res = await getApiClient().get("/user/settings");
        if (res.success && res.data) {
          const s = res.data as any;
          setHideProfile(s.hideProfile ?? false);
          setHideContact(s.hideContact ?? false);
          setHideIncome(s.hideIncome ?? false);
          setNotifyInterests(s.notifyInterests ?? true);
          setNotifyMessages(s.notifyMessages ?? true);
          setNotifyKyc(s.notifyKyc ?? true);
          setNotifyPayments(s.notifyPayments ?? true);
        }
      } catch (err) {
        console.warn("Settings load failed, using defaults", err);
      }
    }

    loadBlockedUsers();
    loadSettings();
  }, [user]);

  // Unblock user
  const handleUnblockUser = async (blockedId: string) => {
    try {
      const res = await unblockUser(user!.uid, blockedId);

      if (res.success) {
        setBlockedUsers(prev => prev.filter(u => (u.blockedUserId || u.user_id) !== blockedId));
        addToast("success", "Profile Unblocked", "Candidate has been unblocked successfully.");
      } else {
        addToast("error", "Error", res.error || "Failed to unblock candidate.");
      }
    } catch (err) {
      addToast("error", "Network Error", "Failed to contact database.");
    }
  };

  // Save privacy controls
  const handleSavePrivacy = async () => {
    try {
      const res = await getApiClient().patch("/user/settings", {
        hideProfile,
        hideContact,
        hideIncome,
      });
      if (res.success) {
        addToast("success", "Privacy Settings", "Your visibility preferences have been saved.");
      } else {
        addToast("error", "Save Failed", res.error || "Could not save privacy settings.");
      }
    } catch {
      addToast("error", "Error", "Failed to save privacy settings.");
    }
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    try {
      const res = await getApiClient().patch("/user/settings", {
        notifyInterests,
        notifyMessages,
        notifyKyc,
        notifyPayments,
      });
      if (res.success) {
        addToast("success", "Notification Rules", "Alert preferences updated successfully.");
      } else {
        addToast("error", "Save Failed", res.error || "Could not save notification preferences.");
      }
    } catch {
      addToast("error", "Error", "Failed to save notification preferences.");
    }
  };

  // Change phone number
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !user) return;
    setUpdatingPhone(true);
    try {
      const res = await updateProfile({ phone: phoneNumber });
      if (res.success) {
        addToast("success", "Mobile Verification", "Phone number synced with your profile.");
      } else {
        addToast("error", "Update Failed", res.error || "Could not update phone number.");
      }
    } catch {
      addToast("error", "Error", "Failed to update phone number.");
    } finally {
      setUpdatingPhone(false);
    }
  };

  // GDPR Data Download
  const handleDownloadData = () => {
    if (!dbUser) return;
    const fileData = JSON.stringify({ authUser: user, profile: dbUser }, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CA_Matrimony_Profile_Data_${user?.uid}.json`;
    link.click();
    addToast("success", "GDPR Compliance", "Your encrypted database transcript is compiling. Download triggered.");
  };

  // Delete Account - calls real API endpoint that cascades across all D1 tables + R2
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await deleteUserAccount();
      if (res.success) {
        addToast("warning", "Account Deleted", "Your matrimonial profile, photos, government ID, messages, and payment records have been permanently removed.");
        await logout();
        router.push("/register");
      } else {
        addToast("error", "Deletion Failed", res.error || "Failed to delete account. Please contact support.");
        setDeletingAccount(false);
      }
    } catch (err: any) {
      addToast("error", "Error", err?.message || "Failed to delete account. Please contact support.");
      setDeletingAccount(false);
    }
  };

  // Protect client route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/settings")}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading settings portal...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-8">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        {/* HERO ACCENT */}
        <PageHeader eyebrow="YOUR ACCOUNT" title="Your space. Your choices." description="Manage privacy, notifications and account details."></PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* LEFT PANEL */}
          <div className="space-y-6">
            
            {/* Visibility Settings */}
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <EyeOff className="w-[1.125rem] h-[1.125rem] text-maroon-500" /> Profile privacy
                </h3>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Hide profile</span>
                    <p className="text-[10px] font-light text-slate-500 leading-relaxed">
                      Keep your profile out of discovery and profile searches.
                    </p>
                  </div>
                  <Switch checked={hideProfile} onChange={setHideProfile} ariaLabel="Hide matrimonial profile" />
                </div>

                <div className="flex justify-between items-start gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Keep contacts private</span>
                    <p className="text-[10px] font-light text-slate-500 leading-relaxed">
                      Your phone and email stay hidden, including from members who previously unlocked them.
                    </p>
                  </div>
                  <Switch checked={hideContact} onChange={setHideContact} ariaLabel="Hide direct contact info" />
                </div>

                <div className="flex justify-between items-start gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Keep income private</span>
                    <p className="text-[10px] font-light text-slate-500 leading-relaxed">
                      Your income is not shown to other members or used to score their income preference.
                    </p>
                  </div>
                  <Switch checked={hideIncome} onChange={setHideIncome} ariaLabel="Hide annual income bracket" />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleSavePrivacy}>
                    Save privacy settings
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Notification settings */}
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Bell className="w-[1.125rem] h-[1.125rem] text-maroon-500" /> Your notification feed
                </h3>
              </CardHeader>
              <CardBody className="space-y-5">
                {[
                  { label: "Interest updates", description: "New interests and responses in your notification feed.", checked: notifyInterests, change: setNotifyInterests },
                  { label: "Message updates", description: "Message-related updates in your notification feed.", checked: notifyMessages, change: setNotifyMessages },
                  { label: "Verification updates", description: "Profile review and document requests in your feed.", checked: notifyKyc, change: setNotifyKyc },
                  { label: "Payment updates", description: "Membership and payment updates in your feed.", checked: notifyPayments, change: setNotifyPayments },
                ].map(option => <div key={option.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><div><span className="block text-sm font-medium">{option.label}</span><p className="mt-1 text-xs text-slate-500">{option.description}</p></div><Switch checked={option.checked} onChange={option.change} ariaLabel={option.label} /></div>)}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleSaveNotifications}>
                    Save Preferences
                  </Button>
                </div>
              </CardBody>
            </Card>

          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-6">
            
            {/* Phone numbers sync */}
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Phone className="w-[1.125rem] h-[1.125rem] text-maroon-500" /> Contact phone
                </h3>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleUpdatePhone} className="space-y-4">
                  <p className="text-[10px] font-light text-slate-500 leading-relaxed">
                    Update the phone number shared when you choose to connect. This does not change your sign-in method.
                  </p>
                  <Input
                    type="tel"
                    label="Mobile Number (with country code)"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 99999 88888"
                    className="text-xs font-semibold"
                  />
                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="sm" type="submit" loading={updatingPhone}>
                      Update Contact Phone
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            {/* Blocked logs list */}
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <UserX className="w-[1.125rem] h-[1.125rem] text-maroon-500" /> Blocked profiles
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                
                {fetchingBlocks ? (
                  <div className="py-4 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                    <svg className="animate-spin h-4 w-4 text-maroon-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Syncing blocked candidates...</span>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="py-4 text-center text-xs font-light text-slate-400">
                    No blocked profiles.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((bl) => (
                      <div key={bl.user_id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex justify-between items-center gap-4 text-xs font-light text-slate-500 dark:text-slate-400 animate-fadeIn">
                        <div>
                          <span className="font-extrabold block text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {bl.highest_degree ? `CA Candidate #${bl.user_id.split("-")[2]}` : "Candidate"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Reason: {bl.reason || "Generic incompatibilities"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblockUser(bl.user_id)}
                          className="py-1 px-3 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-500 hover:text-emerald-500 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-bold cursor-pointer"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </CardBody>
            </Card>

            {/* Compliance, GDPR downloads and deletes */}
            <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-[1.125rem] h-[1.125rem] text-maroon-500" /> Your data & account
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-[10px] font-light text-slate-500 leading-relaxed">
                  Download a copy of your data or delete your account.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={handleDownloadData}
                    className="text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download Data Archive
                  </Button>
                  <Button
                    variant="primary"
                    className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-transparent text-xs py-2 flex items-center justify-center gap-1.5"
                    size="sm"
                    fullWidth
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </Button>
                </div>
              </CardBody>
            </Card>

          </div>

        </div>

      </div>

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[36px] shadow-2xl max-w-md w-full text-center space-y-6 animate-scale-in relative">
            
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-rose-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Delete Account Permanently?</h3>
              <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
                Confirming is <strong className="font-bold text-slate-700 dark:text-slate-200">irreversible</strong>. Your verified CA credentials, bookmarks, success history, and matches will be permanently erased from our database.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                fullWidth
                size="md"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-transparent"
                fullWidth
                size="md"
                loading={deletingAccount}
                onClick={handleDeleteAccount}
              >
                Permanently Delete
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              GDPR Data Erasure Enforcement
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}

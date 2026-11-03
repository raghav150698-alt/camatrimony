"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Button, Input, Select, DataTable, Pagination, Badge, Avatar, ConfirmDialog, Modal, type Column } from "@camatrimony/ui";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api-client";
import { exportToCSV } from "@/lib/export";
import { useAdminAuth } from "@/context/AdminAuthContext";

function AdminUsersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAdminAuth();
  const isSuperAdmin = session?.role === "super_admin";

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [qualification, setQualification] = useState("");

  // Sort state (UX FIX: sort was a console.log stub)
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Selected Rows (for Bulk Actions)
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  // Confirmations
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "ban" | "delete" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Manual Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    phone: "",
    gender: "Male",
    age: "26",
    highestDegree: "CA",
    occupation: "Chartered Accountant",
    annualIncome: "₹15 - ₹20 LPA",
    workLocation: "Hyderabad, TS",
    caste: "Brahmin",
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Auto-open create modal when ?new=true (super_admin only)
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      if (isSuperAdmin) setCreateModalOpen(true);
      router.replace("/users");
    }
  }, [searchParams, router, isSuperAdmin]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load users on filter change
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: currentPage.toString(),
        limit: pageSize.toString(),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (gender) params.gender = gender;
      if (status) params.status = status;
      if (verification) params.verification = verification;
      if (qualification) params.qualification = qualification;
      if (sortColumn) {
        params.sort = sortColumn;
        params.order = sortDirection;
      }

      const data = await adminApi.users(params);
      if (data.success) {
        setUsers(data.users || data.data?.users || []);
        const pag = data.pagination || data.data?.pagination;
        if (pag) {
          setTotalPages(pag.totalPages || 1);
          setTotalItems(pag.totalItems || 0);
        }
        setSelectedRows(new Set()); // reset selection
      }
    } catch (err) {
      console.error("Failed to load users catalog:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, gender, status, verification, qualification, sortColumn, sortDirection]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Sort Toggle (UX FIX: was console.log stub)
  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  // Row selection helpers
  const handleSelectRow = (id: string | number) => {
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === users.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(users.map((u) => u.id)));
    }
  };

  // Bulk Actions
  const handleBulkExport = () => {
    const dataToExport = selectedRows.size > 0
      ? users.filter((u) => selectedRows.has(u.id))
      : users;

    exportToCSV(
      dataToExport,
      [
        { key: "id", header: "User ID" },
        { key: "email", header: "Email Address" },
        { key: "phone", header: "Phone Number" },
        { key: "gender", header: "Gender" },
        { key: "age", header: "Age" },
        { key: "highest_degree", header: "Degree" },
        { key: "occupation", header: "Occupation" },
        { key: "annual_income", header: "Income" },
        { key: "work_location", header: "Work Location" },
        { key: "status", header: "Status" },
      ],
      `CA_Matrimony_Users_${Date.now()}`
    );
  };

  // Open Actions Dialog
  const triggerUserAction = (user: any, action: "suspend" | "ban" | "delete") => {
    setSelectedUser(user);
    setActionType(action);
    setActionReason("");
    setActionError("");
  };

  const confirmUserAction = async () => {
    if (!selectedUser || !actionType) return;
    if ((actionType === "ban" || actionType === "suspend") && !actionReason.trim()) {
      setActionError("A reason is required.");
      return;
    }
    setActionLoading(true);
    setActionError("");

    try {
      if (actionType === "delete") {
        const data = await adminApi.deleteUser(selectedUser.id);
        if (data.success) {
          setUsers(users.filter((u) => u.id !== selectedUser.id));
          setSelectedUser(null);
          setActionType(null);
          showToast("User deleted successfully.");
        } else {
          setActionError(data.error || "Delete failed.");
          showToast(data.error || "Delete failed.", "error");
        }
      } else {
        const newStatus = actionType === "ban" ? "banned" : "suspended";
        const data = await adminApi.updateUser(selectedUser.id, {
          status: newStatus,
          banReason: actionReason.trim(),
        });
        if (data.success) {
          setUsers(
            users.map((u) => (u.id === selectedUser.id ? { ...u, status: newStatus } : u))
          );
          setSelectedUser(null);
          setActionType(null);
          setActionReason("");
          showToast(`User ${newStatus} successfully.`);
        } else {
          setActionError(data.error || `${actionType} failed.`);
          showToast(data.error || `${actionType} failed.`, "error");
        }
      }
    } catch (err) {
      console.error(`User ${actionType} action failed:`, err);
      setActionError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Profile Creation
  const handleCreateUser = async () => {
    setCreateError("");
    setCreateLoading(true);

    try {
      const data = await adminApi.createUser(newUser);
      if (data.success) {
        setCreateModalOpen(false);
        // Refresh catalog list
        setCurrentPage(1);
        setSearch(newUser.email);
      } else {
        setCreateError(data.error || data.message || "Failed to create candidate user.");
      }
    } catch (err) {
      setCreateError("Connection timeout. Failed to create profile.");
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Candidate Name",
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={row.full_name || row.email?.split("@")[0] || "Candidate"}
            isVerified={row.is_verified === 1}
            size="md"
          />
          <div>
            <Link href={`/users/${row.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-maroon-600 hover:underline">
              {row.full_name || row.email?.split("@")[0] || "Unnamed Candidate"}
            </Link>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {row.email || "No email"} · UID {row.id?.substring(0, 10)}…
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Info",
      render: (row: any) => (
        <div className="text-xs space-y-0.5 font-semibold">
          <p className="text-slate-700 dark:text-slate-300">{row.email || "No Email Provided"}</p>
          <p className="text-slate-400">{row.phone || "No Phone Number"}</p>
        </div>
      ),
    },
    {
      key: "profile",
      header: "Age & Gender",
      sortable: true,
      render: (row: any) => (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p>{row.gender} ({row.age} Yrs)</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.work_location || "Location Not Shared"}</p>
        </div>
      ),
    },
    {
      key: "qualification",
      header: "Degree & Role",
      render: (row: any) => (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p className="text-slate-800 dark:text-slate-200">{row.highest_degree || "Professional"}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.occupation || "Auditor"}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Package Plan",
      render: (row: any) => {
        const plan = row.plan_name;
        if (!plan) {
          return <Badge variant="neutral" size="sm">Free</Badge>;
        }
        const lower = String(plan).toLowerCase();
        const variant =
          lower.includes("platinum") || lower.includes("diamond")
            ? ("info" as const)
            : lower.includes("gold")
              ? ("gold" as const)
              : ("maroon" as const);
        return <Badge variant={variant} size="sm">{plan}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: any) => {
        const colors = {
          active: "success" as const,
          suspended: "warning" as const,
          banned: "danger" as const,
          pending_verification: "neutral" as const,
        };
        const labels = {
          active: "Active",
          suspended: "Suspended",
          banned: "Banned",
          pending_verification: "Pending",
        };
        const userStatus = row.status || "active";
        return (
          <Badge variant={colors[userStatus as keyof typeof colors] || "neutral"} size="sm" showDot>
            {labels[userStatus as keyof typeof labels] || userStatus}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-20 text-center",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 justify-center">
          <Link href={`/users/${row.id}`} title="View Detailed Workspace">
            <Button variant="ghost" size="sm" className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Button>
          </Link>
          {row.status !== "suspended" && row.status !== "banned" && (
            <button
              onClick={() => triggerUserAction(row, "suspend")}
              title="Suspend Candidate"
              className="p-1 rounded-full text-amber-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          )}
          {row.status !== "banned" && (
            <button
              onClick={() => triggerUserAction(row, "ban")}
              title="Ban Candidate Account"
              className="p-1 rounded-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Upper Module Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            User Management CRUD Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin register profiles, enforce bans, manage suspensions, and audit contact caps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkExport} className="bg-white hover:bg-slate-50">
            Export Records ({selectedRows.size > 0 ? selectedRows.size : "All"})
          </Button>
          {isSuperAdmin && (
            <Button variant="gold" size="sm" onClick={() => setCreateModalOpen(true)}>
              Provision CA Profile
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-center">
          <Input
            placeholder="Search name, email, phone, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Male Matches", value: "Male" },
              { label: "Female Matches", value: "Female" },
            ]}
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Gender Profile"
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Active Users", value: "active" },
              { label: "Suspended", value: "suspended" },
              { label: "Banned", value: "banned" },
              { label: "Awaiting Verification", value: "pending_verification" },
            ]}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Account Status"
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Verified Badge Users", value: "verified" },
              { label: "Unverified Users", value: "unverified" },
            ]}
            value={verification}
            onChange={(e) => {
              setVerification(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Verification State"
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Chartered Accountant (CA)", value: "CA" },
              { label: "Company Secretary (CS)", value: "CS" },
              { label: "CMA / Finance", value: "CMA" },
            ]}
            value={qualification}
            onChange={(e) => {
              setQualification(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Qualifications"
            className="py-2.5 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {/* Grid Datatable Canvas */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        getRowId={(row) => row.id}
        emptyTitle="No candidates found matching filters."
        emptyDescription="Please adjust search keyword strings or selection values."
      />

      {/* Pagination component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
      />

      {/* Action Dialog Overlay Modals */}
      <ConfirmDialog
        isOpen={!!actionType}
        onClose={() => {
          setSelectedUser(null);
          setActionType(null);
          setActionReason("");
          setActionError("");
        }}
        onConfirm={confirmUserAction}
        title={actionType === "delete" ? "Permanently Delete Profile?" : actionType === "ban" ? "Ban Account?" : "Suspend Account?"}
        message={
          actionType === "delete"
            ? "Are you absolutely sure you want to permanently delete this candidate? This will wipe all photos, locks, and chats. This action is irreversible!"
            : actionType === "ban"
            ? "Banned users are permanently locked out of log in and their profile matches are hidden."
            : "Suspended profiles are temporarily disabled. You can reactivate them later from detail page."
        }
        confirmText={actionType === "delete" ? "Delete Account" : actionType === "ban" ? "Ban User" : "Suspend"}
        variant={actionType === "delete" || actionType === "ban" ? "danger" : "primary"}
        loading={actionLoading}
        reasonRequired={actionType === "ban" || actionType === "suspend"}
        reasonLabel={actionType === "ban" ? "Ban reason" : "Suspension reason"}
        reasonPlaceholder="Required — explain why this action is taken"
        reasonValue={actionReason}
        onReasonChange={(v) => {
          setActionReason(v);
          setActionError("");
        }}
      >
        {actionError ? (
          <p className="text-xs text-rose-500 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
            {actionError}
          </p>
        ) : null}
      </ConfirmDialog>

      {/* Create Profile Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision Matrimonial Candidate profile"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateModalOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleCreateUser} loading={createLoading}>
              Register Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && <p className="text-xs text-rose-500 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-100">{createError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Address"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="candidate@example.com"
            />
            <Input
              label="Phone Number"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              placeholder="+91 99999 88888"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Gender"
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
              ]}
              value={newUser.gender}
              onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
              placeholder=""
            />
            <Input
              label="Age"
              type="number"
              value={newUser.age}
              onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
            />
            <Input
              label="Caste / Subcaste"
              value={newUser.caste}
              onChange={(e) => setNewUser({ ...newUser, caste: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Highest Degree"
              value={newUser.highestDegree}
              onChange={(e) => setNewUser({ ...newUser, highestDegree: e.target.value })}
              placeholder="CA, CFA L3"
            />
            <Input
              label="Occupation"
              value={newUser.occupation}
              onChange={(e) => setNewUser({ ...newUser, occupation: e.target.value })}
              placeholder="Investment Banker"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Annual Income"
              value={newUser.annualIncome}
              onChange={(e) => setNewUser({ ...newUser, annualIncome: e.target.value })}
              placeholder="₹15 - ₹20 LPA"
            />
            <Input
              label="Work Location"
              value={newUser.workLocation}
              onChange={(e) => setNewUser({ ...newUser, workLocation: e.target.value })}
              placeholder="Hyderabad, TS"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminUsersPageInner />
    </Suspense>
  );
}

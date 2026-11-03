"use client";

import React, { useState, useCallback, Suspense } from "react";
import {
  Button,
  Input,
  DataTable,
  Pagination,
  Modal,
  Badge,
  Avatar,
  EmptyState,
  type Column,
} from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface MatchProfile {
  userId: string;
  profileCreatedBy: string;
  gender: string;
  age: number;
  maritalStatus: string;
  religion: string;
  caste: string;
  highestDegree: string;
  occupation: string;
  annualIncome: string;
  workLocation: string;
  isVerified: boolean;
  aboutMe?: string;
  userEmail?: string;
}

interface SuggestedMatch {
  profile: MatchProfile;
  score: number;
}

interface TargetCandidate {
  userId: string;
  profileCreatedBy?: string;
  gender: string;
  age: number;
  caste?: string;
  highestDegree?: string;
  workLocation?: string;
}

interface MatchesResponse {
  success: boolean;
  targetCandidate: TargetCandidate | null;
  matches: SuggestedMatch[];
  error?: string;
  message?: string;
}

interface SuggestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

function AdminMatchesPageInner() {
  const [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<SuggestedMatch[]>([]);
  const [target, setTarget] = useState<TargetCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestSuccess, setSuggestSuccess] = useState<string | null>(null);

  const fetchMatches = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError("Please enter a candidate user ID.");
      setMatches([]);
      setTarget(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMatches([]);
    setTarget(null);
    setCurrentPage(1);

    try {
      const res = await adminApi.matches(trimmed);
      const data = res as MatchesResponse;
      if (data.success) {
        setMatches(data.matches || []);
        setTarget(data.targetCandidate || null);
      } else {
        setError(data.error || "Failed to load match suggestions.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    fetchMatches(candidateId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const openSuggestModal = (from: string, to: string) => {
    setFromUserId(from || candidateId);
    setToUserId(to || "");
    setSuggestError(null);
    setSuggestSuccess(null);
    setModalOpen(true);
  };

  const closeSuggestModal = () => {
    setModalOpen(false);
    setSuggestError(null);
    setSuggestSuccess(null);
  };

  const handleSuggest = async () => {
    if (!fromUserId.trim() || !toUserId.trim()) {
      setSuggestError("Both user IDs are required.");
      return;
    }

    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestSuccess(null);

    try {
      const res = await adminApi.suggestMatch(fromUserId.trim(), toUserId.trim());
      const data = res as SuggestResponse;
      if (data.success) {
        setSuggestSuccess(data.message || "Match suggestion sent successfully.");
        setToUserId("");
      } else {
        setSuggestError(data.error || "Failed to suggest match.");
      }
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Network request failed.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const totalItems = matches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIdx = (currentPageSafe - 1) * pageSize;
  const paginatedMatches = matches.slice(startIdx, startIdx + pageSize);

  const columns: Column<SuggestedMatch>[] = [
    {
      key: "candidate",
      header: "Suggested Candidate",
      render: (row) => {
        const displayName =
          (row.profile.userEmail ? row.profile.userEmail.split("@")[0] : row.profile.profileCreatedBy) ||
          "Candidate";
        return (
          <div className="flex items-center gap-3">
            <Avatar name={displayName} isVerified={row.profile.isVerified} size="md" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{displayName}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                UID: {row.profile.userId.substring(0, 8)}...
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact Info",
      render: (row) => (
        <div className="text-xs space-y-0.5 font-semibold">
          <p className="text-slate-700 dark:text-slate-300">
            {row.profile.userEmail || "No email provided"}
          </p>
        </div>
      ),
    },
    {
      key: "profile",
      header: "Age & Gender",
      render: (row) => (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p>
            {row.profile.gender} ({row.profile.age} Yrs)
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {row.profile.workLocation || "Location not shared"}
          </p>
        </div>
      ),
    },
    {
      key: "background",
      header: "Religion & Caste",
      render: (row) => (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p className="text-slate-800 dark:text-slate-200">{row.profile.religion || "N/A"}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.profile.caste || "Caste not shared"}</p>
        </div>
      ),
    },
    {
      key: "qualification",
      header: "Degree & Occupation",
      render: (row) => (
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          <p className="text-slate-800 dark:text-slate-200">{row.profile.highestDegree || "N/A"}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.profile.occupation || "N/A"}</p>
        </div>
      ),
    },
    {
      key: "income",
      header: "Annual Income",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {row.profile.annualIncome || "Not shared"}
        </span>
      ),
    },
    {
      key: "score",
      header: "Match Score",
      render: (row) => (
        <Badge
          variant={row.score >= 80 ? "success" : row.score >= 50 ? "warning" : "neutral"}
          size="sm"
        >
          {row.score}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-24 text-center",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSuggestModal(candidateId, row.profile.userId)}
          disabled={!candidateId.trim()}
        >
          Suggest
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Matches & Compatibility
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search a candidate to view ranked suggestions and manually propose premium pairings.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => openSuggestModal(candidateId, "")}>
          Manual Match
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3.5">
          <Input
            label="Candidate user ID"
            placeholder="Paste Firebase UID from Users"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            onKeyDown={handleKeyDown}
            className="py-2.5 rounded-xl border-slate-200"
            helperText="Use the Firebase UID from the Users page (not email)."
          />
          <Button variant="gold" size="sm" onClick={handleSearch} loading={loading}>
            Find Matches
          </Button>
        </div>
      </div>

      {target && (
        <div className="bg-maroon-50 dark:bg-maroon-950/20 border border-maroon-100 dark:border-maroon-900 rounded-3xl p-5">
          <h3 className="text-sm font-bold text-maroon-700 dark:text-maroon-300">
            Target Candidate: {target.profileCreatedBy || target.userId}
          </h3>
          <p className="text-xs text-maroon-600 dark:text-maroon-400 mt-1">
            {target.gender} • {target.age} Yrs • {target.caste || "Caste not shared"} •{" "}
            {target.highestDegree || "Degree not shared"} •{" "}
            {target.workLocation || "Location not shared"}
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-3xl p-4"
        >
          <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{error}</p>
        </div>
      )}

      {!loading && !candidateId.trim() && matches.length === 0 ? (
        <EmptyState
          title="Search for a candidate"
          description="Enter a candidate user ID above to load ranked match suggestions."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginatedMatches}
            loading={loading}
            emptyTitle="No matches found"
            emptyDescription="Try a different candidate ID or broaden search filters."
            getRowId={(row) => row.profile.userId}
          />
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPageSafe}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeSuggestModal}
        title="Manually Suggest a Match"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeSuggestModal} disabled={suggestLoading}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleSuggest} loading={suggestLoading}>
              Suggest Match
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {suggestError && (
            <p
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900"
            >
              {suggestError}
            </p>
          )}
          {suggestSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
              {suggestSuccess}
            </p>
          )}
          <Input
            label="From User ID"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
            placeholder="Candidate Firebase UID"
            helperText="Paste Firebase UID from the Users page."
          />
          <Input
            label="To User ID"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            placeholder="Suggested match Firebase UID"
            helperText="Paste Firebase UID from the Users page."
          />
        </div>
      </Modal>
    </div>
  );
}

export default function AdminMatchesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminMatchesPageInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

interface KYCRecord {
  id: number;
  status: string;
  document_type: string;
  document_ref_url: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ Pending review",
  APPROVED: "✓ Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export default function KYCPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [record, setRecord] = useState<KYCRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [documentType, setDocumentType] = useState("CNIC");
  const [documentRefUrl, setDocumentRefUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const res = await authFetch("/api/kyc/");
      if (res.ok && res.status !== 204) {
        setRecord(await res.json());
      }
      setLoading(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/kyc/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: documentType, document_ref_url: documentRefUrl }),
      });
      if (res.ok) {
        setRecord(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || "Submission failed.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const canSubmit = !record || record.status === "REJECTED" || record.status === "EXPIRED";

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-[620px] bg-paper-raised border border-border-strong rounded-[10px] overflow-hidden">
          <div className="bg-[#0E2430] px-6 py-[22px] flex items-center gap-3.5">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7FD4C1" strokeWidth="1.6">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] font-semibold text-[#F2F7F8]">Identity verification</span>
              <span className="text-[12.5px] text-[#A9C0C9]">
                Required by State Bank rules before any payout. Encrypted, reviewed by our compliance desk.
              </span>
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col gap-5">
            {record && (
              <div
                className={`rounded-[9px] p-4 flex flex-col gap-1.5 ${
                  record.status === "APPROVED"
                    ? "bg-success-bg border border-success"
                    : record.status === "REJECTED"
                      ? "bg-alert/10 border border-alert"
                      : "bg-warning-bg border border-warning"
                }`}
              >
                <span className="text-[13.5px] font-semibold">
                  {STATUS_LABEL[record.status] ?? record.status}
                </span>
                <span className="font-mono text-[11.5px] text-muted">
                  Submitted{" "}
                  {new Date(record.submitted_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {record.status === "REJECTED" && record.rejection_reason && (
                  <span className="text-[12.5px] text-alert">{record.rejection_reason}</span>
                )}
                {record.status === "PENDING" && (
                  <span className="text-[12.5px] text-warning">
                    With the compliance desk. Points keep accruing while you wait.
                  </span>
                )}
              </div>
            )}

            {canSubmit && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold">Document type</span>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion"
                  >
                    <option value="CNIC">CNIC</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold">Document link</span>
                  <input
                    className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion font-mono"
                    placeholder="https://..."
                    value={documentRefUrl}
                    onChange={(e) => setDocumentRefUrl(e.target.value)}
                  />
                  <span className="text-[11.5px] text-muted">
                    Link to a scan or photo of your {documentType === "CNIC" ? "CNIC" : "passport"}.
                  </span>
                </div>

                <div className="bg-[#EAF2F5] border border-[#BCD4DE] rounded-[8px] p-3.5 flex gap-2.5">
                  <span className="text-verified text-[15px]">🛡</span>
                  <span className="text-[12.5px] text-verified leading-[1.55]">
                    Documents are visible only to the compliance desk. Review takes 2–3 working days. We
                    will never ask for your password, OTP or PIN.
                  </span>
                </div>

                {error && <p className="text-alert text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || !documentRefUrl}
                  className="self-start bg-[#0E2430] text-[#F2F7F8] text-sm font-semibold px-[22px] py-[13px] rounded-[7px] disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}

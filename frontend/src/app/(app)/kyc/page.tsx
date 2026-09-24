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
  has_document_file: boolean;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "In progress",
  APPROVED: "Verified",
  REJECTED: "Needs resubmission",
  EXPIRED: "Expired — resubmit",
};

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-premium-bg text-premium",
  APPROVED: "bg-mint text-primary-deep",
  REJECTED: "bg-alert-bg text-alert",
  EXPIRED: "bg-alert-bg text-alert",
};

export default function KYCPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [record, setRecord] = useState<KYCRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [documentType, setDocumentType] = useState("CNIC");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
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
      if (!documentFile) return;
      const form = new FormData();
      form.append("document_type", documentType);
      form.append("document_file", documentFile);
      const res = await authFetch("/api/kyc/", { method: "POST", body: form });
      if (res.ok) {
        setRecord(await res.json());
        setDocumentFile(null);
      } else {
        const body = await res.json().catch(() => ({}));
        const fieldError = body.document_file?.[0] ?? body.non_field_errors?.[0];
        setError(body.detail || fieldError || "Submission failed.");
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
  const stepDone = { details: true, docs: !!record, review: record?.status === "APPROVED" };

  const STEPS = [
    { n: 1, label: "Personal details", sub: "Done", done: true },
    {
      n: 2,
      label: "CNIC & selfie",
      sub: canSubmit ? "In progress" : "Submitted",
      done: !canSubmit,
    },
    { n: 3, label: "Review", sub: "Usually 24 hrs", done: record?.status === "APPROVED" },
    {
      n: 4,
      label: "Verified",
      sub: "Withdrawals unlocked",
      done: record?.status === "APPROVED",
    },
  ];

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[.12em] text-primary">
            IDENTITY VERIFICATION
          </span>
          <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
            Verify it&apos;s you, once.
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-border rounded-2xl overflow-hidden">
          {STEPS.map((s, i) => {
            const isCurrent = !stepDone.review && s.n === 2 && canSubmit;
            return (
              <div
                key={s.n}
                className={`p-4 flex items-center gap-3 ${
                  i < STEPS.length - 1 ? "border-r border-[#EFEEE8]" : ""
                } ${isCurrent ? "bg-premium-bg" : ""}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                    s.done
                      ? "bg-primary text-white"
                      : isCurrent
                        ? "bg-ink text-marigold font-mono text-xs"
                        : "border-[1.5px] border-border-strong text-muted-2 font-mono text-xs"
                  }`}
                >
                  {s.done ? "✓" : s.n}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold truncate">{s.label}</span>
                  <span
                    className={`text-xs truncate ${isCurrent ? "text-premium" : "text-muted-2"}`}
                  >
                    {s.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <div className="bg-white border border-border rounded-[22px] p-6 md:p-7 flex flex-col gap-5">
            {record && (
              <div
                className={`rounded-2xl p-4 flex flex-col gap-1.5 ${STATUS_PILL[record.status] ?? "bg-paper text-muted"}`}
              >
                <span className="text-sm font-semibold">
                  {STATUS_LABEL[record.status] ?? record.status}
                </span>
                <span className="font-mono text-xs opacity-80">
                  Submitted{" "}
                  {new Date(record.submitted_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {record.status === "REJECTED" && record.rejection_reason && (
                  <span className="text-[13px]">{record.rejection_reason}</span>
                )}
                {record.status === "PENDING" && (
                  <span className="text-[13px]">
                    With the compliance desk. Points keep accruing while you wait.
                  </span>
                )}
              </div>
            )}

            {canSubmit && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold">Document type</span>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="h-[46px] bg-white border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="CNIC">CNIC</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold">
                    {documentType === "CNIC" ? "CNIC" : "Passport"} scan or photo
                  </span>
                  <label
                    className={`min-h-[140px] rounded-[14px] border-[1.5px] border-dashed flex flex-col items-center justify-center gap-1.5 text-center px-4 py-5 cursor-pointer ${
                      documentFile ? "border-primary bg-[#F3FAF6]" : "border-border-strong"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                      className="sr-only"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                    />
                    {documentFile ? (
                      <>
                        <span className="text-sm font-semibold text-primary-deep">
                          ✓ {documentFile.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted">
                          {(documentFile.size / (1024 * 1024)).toFixed(1)} MB · click to replace
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold">Upload document</span>
                        <span className="text-xs text-muted">
                          <span className="text-primary underline">Click to browse</span> · JPG, PNG or
                          PDF, max 5 MB
                        </span>
                      </>
                    )}
                  </label>
                </div>

                <div className="flex gap-2.5 items-start text-[13px] text-graphite bg-paper rounded-2xl p-3.5">
                  <span className="w-[18px] h-[18px] rounded-[5px] bg-primary text-white text-xs flex items-center justify-center shrink-0">
                    ✓
                  </span>
                  I confirm these documents are mine and consent to their use for identity
                  verification.
                </div>

                {error && <p className="text-alert text-sm">{error}</p>}

                <div className="flex justify-between items-center border-t border-[#EFEEE8] pt-4">
                  <span className="text-[13px] text-muted">Step 2 of 3</span>
                  <button
                    type="submit"
                    disabled={submitting || !documentFile}
                    className="bg-primary text-white font-semibold text-[15px] px-5 py-3 rounded-xl disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit for review"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bg-ink text-white rounded-[22px] p-6 flex flex-col gap-3.5">
              <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
                WHY WE ASK
              </span>
              <span className="font-display text-2xl leading-[1.15]">
                Cash payouts in Pakistan must follow State Bank of Pakistan know-your-customer
                rules.
              </span>
              <span className="text-[13px] leading-[1.55] text-[#C9CFDC]">
                We verify once, then every withdrawal goes only to accounts registered in your
                name. Documents are encrypted and never shown to other users.
              </span>
            </div>
          </aside>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}

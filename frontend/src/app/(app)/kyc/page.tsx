"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import { authFetchErrorMessage } from "@/lib/api-client";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

interface KYCRecord {
  id: number;
  status: string;
  document_type: string;
  document_ref_url: string;
  has_legacy_document: boolean;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
}

type UploadKey = "cnic_front" | "cnic_back" | "selfie";

const UPLOADS: { key: UploadKey; label: string }[] = [
  { key: "cnic_front", label: "CNIC front" },
  { key: "cnic_back", label: "CNIC back" },
  { key: "selfie", label: "Selfie with CNIC" },
];

const MAX_BYTES = 5 * 1024 * 1024;
const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

function formatCnic(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
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

  const [fullName, setFullName] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [files, setFiles] = useState<Record<UploadKey, File | null>>({
    cnic_front: null,
    cnic_back: null,
    selfie: null,
  });
  const [fileErrors, setFileErrors] = useState<Partial<Record<UploadKey, string>>>({});
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

  function pickFile(key: UploadKey, file: File | null) {
    if (file && !["image/jpeg", "image/png"].includes(file.type)) {
      setFileErrors((e) => ({ ...e, [key]: "Use a JPG or PNG image." }));
      return;
    }
    if (file && file.size > MAX_BYTES) {
      setFileErrors((e) => ({ ...e, [key]: "Image is over 5 MB." }));
      return;
    }
    setFileErrors((e) => ({ ...e, [key]: undefined }));
    setFiles((f) => ({ ...f, [key]: file }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("document_type", "CNIC");
      form.append("full_name", fullName.trim());
      form.append("cnic_number", cnicNumber);
      for (const { key } of UPLOADS) form.append(key, files[key] as File);
      const res = await authFetch("/api/kyc/", { method: "POST", body: form });
      if (res.ok) {
        setRecord(await res.json());
        setFiles({ cnic_front: null, cnic_back: null, selfie: null });
        // The sidebar's KYC status comes from this page's `user` state, set once on mount --
        // without this, it only shows the real status (NONE -> PENDING) after a full reload.
        const refreshed = await fetchCurrentUser();
        if (refreshed) setUser(refreshed);
      } else {
        setError(await authFetchErrorMessage(res, "Submission failed."));
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Full name, as on CNIC</span>
                    <input
                      required
                      maxLength={150}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">CNIC number</span>
                    <input
                      required
                      inputMode="numeric"
                      placeholder="42101-1234567-2"
                      value={cnicNumber}
                      onChange={(e) => setCnicNumber(formatCnic(e.target.value))}
                      className={`h-[46px] border rounded-[11px] px-3.5 font-mono text-[15px] tracking-[.04em] outline-none focus:border-primary ${
                        cnicNumber && !CNIC_PATTERN.test(cnicNumber)
                          ? "border-alert"
                          : "border-border-strong"
                      }`}
                    />
                    <span className="text-xs text-muted">13 digits: XXXXX-XXXXXXX-X</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {UPLOADS.map(({ key, label }) => {
                    const file = files[key];
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label
                          className={`aspect-[1.4] min-h-[120px] rounded-[14px] border-[1.5px] border-dashed flex flex-col items-center justify-center gap-1.5 text-center px-3 cursor-pointer ${
                            file ? "border-primary bg-[#F3FAF6]" : "border-border-strong"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            className="sr-only"
                            onChange={(e) => {
                              pickFile(key, e.target.files?.[0] ?? null);
                              e.target.value = "";
                            }}
                          />
                          {file ? (
                            <>
                              <span className="text-sm font-semibold text-primary-deep">
                                ✓ {label}
                              </span>
                              <span className="font-mono text-[11px] text-muted break-all">
                                {file.name.slice(0, 22)} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold">{label}</span>
                              <span className="text-xs text-muted">
                                <span className="text-primary underline">Browse</span> · JPG or PNG
                              </span>
                            </>
                          )}
                        </label>
                        {fileErrors[key] && (
                          <span className="text-xs text-alert">{fileErrors[key]}</span>
                        )}
                      </div>
                    );
                  })}
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
                    disabled={
                      submitting ||
                      !fullName.trim() ||
                      !CNIC_PATTERN.test(cnicNumber) ||
                      UPLOADS.some((u) => !files[u.key])
                    }
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
                We verify once. Withdrawals must go to an account registered in your own name.
                Your documents are stored encrypted at rest in private storage and are only
                viewable by our compliance team.
              </span>
            </div>
          </aside>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}

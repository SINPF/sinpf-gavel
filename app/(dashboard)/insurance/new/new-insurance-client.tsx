"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Save, AlertTriangle } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import { createInsurancePolicy } from "@/app/actions/create-insurance-policy";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const TYPES = [
  { value: "medical", label: "Medical" },
  { value: "property", label: "Property" },
];

const CURRENCIES = [
  { value: "sbd", label: "SBD — Solomon Islands Dollar" },
  { value: "usd", label: "USD" },
  { value: "aud", label: "AUD" },
  { value: "nzd", label: "NZD" },
  { value: "eur", label: "EUR" },
  { value: "other", label: "Other" },
];

const DOC_TYPES = [
  { value: "policy_schedule", label: "Policy schedule" },
  { value: "renewal_notice", label: "Renewal notice" },
  { value: "claim_document", label: "Claim document" },
  { value: "other", label: "Other" },
];

const DUPLICATE_PREFIX = "DUPLICATE_POLICY_NUMBER:";

export default function NewInsuranceClient() {
  const router = useRouter();
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [insurerContact, setInsurerContact] = useState("");
  const [policyType, setPolicyType] = useState("medical");
  const [insuredSubject, setInsuredSubject] = useState("");
  const [linkedTitleId, setLinkedTitleId] = useState("");
  const [coverageStart, setCoverageStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [coverageEnd, setCoverageEnd] = useState("");
  const [policyValue, setPolicyValue] = useState<number | "">("");
  const [premiumAmount, setPremiumAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("sbd");
  const [initialDocType, setInitialDocType] = useState("policy_schedule");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateRef, setDuplicateRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    policyNumber.trim().length >= 1 &&
    insurerName.trim().length >= 2 &&
    insuredSubject.trim().length >= 2 &&
    !!coverageStart &&
    !!coverageEnd &&
    coverageEnd > coverageStart;

  function buildFormData(confirmDuplicate: boolean): FormData {
    const formData = new FormData();
    formData.append("policyNumber", policyNumber.trim());
    formData.append("insurerName", insurerName.trim());
    if (insurerContact.trim()) formData.append("insurerContact", insurerContact.trim());
    formData.append("policyType", policyType);
    formData.append("insuredSubject", insuredSubject.trim());
    if (linkedTitleId.trim()) formData.append("linkedTitleId", linkedTitleId.trim());
    formData.append("coverageStart", coverageStart);
    formData.append("coverageEnd", coverageEnd);
    formData.append("policyValue", policyValue === "" ? "0" : String(policyValue));
    if (premiumAmount !== "") formData.append("premiumAmount", String(premiumAmount));
    formData.append("currency", currency);
    if (confirmDuplicate) formData.append("confirmDuplicate", "true");
    const files = fileRef.current?.files;
    if (files) {
      Array.from(files).forEach((f) => {
        formData.append("files", f);
        formData.append("fileDocTypes", initialDocType);
      });
    }
    return formData;
  }

  async function submit(confirmDuplicate = false) {
    setError(null);
    if (!confirmDuplicate) setDuplicateRef(null);
    if (!canSubmit) {
      setError("Fill in insurer, policy number, insured subject, and valid dates.");
      return;
    }
    setSubmitting(true);
    try {
      const { policyId } = await createInsurancePolicy(buildFormData(confirmDuplicate));
      router.push(`/insurance/${policyId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save policy.";
      const dupIdx = msg.indexOf(DUPLICATE_PREFIX);
      if (dupIdx !== -1) {
        setDuplicateRef(msg.slice(dupIdx + DUPLICATE_PREFIX.length).trim());
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Insurer <span className="text-destructive">*</span>
          </label>
          <input
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Capital Insurance"
          />
        </div>
        <div>
          <label className={labelCls}>
            Policy number <span className="text-destructive">*</span>
          </label>
          <input
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className={inputCls}
            placeholder="Insurer's policy number"
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Insurer contact (optional)</label>
          <input
            value={insurerContact}
            onChange={(e) => setInsurerContact(e.target.value)}
            className={inputCls}
            placeholder="Named contact, phone or email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Type <span className="text-destructive">*</span>
          </label>
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
            className={inputCls}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            Insured asset or person <span className="text-destructive">*</span>
          </label>
          <input
            value={insuredSubject}
            onChange={(e) => setInsuredSubject(e.target.value)}
            className={inputCls}
            placeholder="e.g. All staff, or Head office building"
          />
        </div>
        <div>
          <label className={labelCls}>
            Coverage start <span className="text-destructive">*</span>
          </label>
          <DateField value={coverageStart} onChange={setCoverageStart} />
        </div>
        <div>
          <label className={labelCls}>
            Coverage end <span className="text-destructive">*</span>
          </label>
          <DateField value={coverageEnd} onChange={setCoverageEnd} />
        </div>
        <div>
          <label className={labelCls}>
            Sum insured <span className="text-destructive">*</span>
          </label>
          <AmountInput
            value={policyValue}
            onChange={(e) =>
              setPolicyValue(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Premium amount (optional)</label>
          <AmountInput
            value={premiumAmount}
            onChange={(e) =>
              setPremiumAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Linked title (optional)</label>
          <input
            value={linkedTitleId}
            onChange={(e) => setLinkedTitleId(e.target.value)}
            className={inputCls}
            placeholder="Title reference, if a property policy"
          />
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <div>
          <label className={labelCls}>Attach policy documents (optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            You can also upload documents after the policy is registered.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={initialDocType}
              onChange={(e) => setInitialDocType(e.target.value)}
              className={`${inputCls} max-w-xs`}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input ref={fileRef} type="file" multiple className="text-sm" />
          </div>
        </div>
      </div>

      {duplicateRef && (
        <div className="p-4 rounded-md bg-warning/10 border border-warning/40 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-semibold text-warning">
                A policy with this number already exists for {insurerName || "this insurer"}.
              </p>
              <p className="mt-1 text-muted-foreground">
                Existing reference:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {duplicateRef}
                </span>
                . Continue only if this is a genuine second policy (e.g., a
                renewal issued under the same number).
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDuplicateRef(null)}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
            >
              Change policy number
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-warning text-warning-foreground hover:bg-warning/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Register anyway"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/insurance")}
          className="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={!canSubmit || submitting || !!duplicateRef}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Register policy"}
        </button>
      </div>
    </div>
  );
}

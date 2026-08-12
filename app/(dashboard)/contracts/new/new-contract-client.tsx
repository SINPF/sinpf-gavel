"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Trash2, Save } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import { createContract } from "@/app/actions/create-contract";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const TYPES = [
  { value: "lease", label: "Lease" },
  { value: "service_agreement", label: "Service agreement" },
  { value: "mou", label: "MOU" },
  { value: "supply", label: "Supply" },
  { value: "consultancy", label: "Consultancy" },
  { value: "other", label: "Other" },
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
  { value: "signed_contract", label: "Signed contract" },
  { value: "draft_contract", label: "Draft contract" },
  { value: "variation_addendum", label: "Variation / addendum" },
  { value: "termination_notice", label: "Termination notice" },
  { value: "other", label: "Other" },
];

export default function NewContractClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [parties, setParties] = useState<string[]>([""]);
  const [contractType, setContractType] = useState("service_agreement");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [contractValue, setContractValue] = useState<number | "">("");
  const [currency, setCurrency] = useState("sbd");
  const [owningDepartment, setOwningDepartment] = useState("");
  const [signedDocType, setSignedDocType] = useState("signed_contract");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cleanParties = parties.map((p) => p.trim()).filter(Boolean);
  const canSubmit = title.trim().length >= 2 && cleanParties.length >= 1 && !!startDate && !!endDate && endDate >= startDate;

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError("Fill in the title, at least one party, and valid dates.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      cleanParties.forEach((p) => formData.append("parties", p));
      formData.append("contractType", contractType);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("contractValue", contractValue === "" ? "0" : String(contractValue));
      formData.append("currency", currency);
      if (owningDepartment.trim()) formData.append("owningDepartment", owningDepartment.trim());

      const files = fileRef.current?.files;
      if (files) {
        Array.from(files).forEach((f) => {
          formData.append("files", f);
          formData.append("fileDocTypes", signedDocType);
        });
      }

      const { contractId } = await createContract(formData);
      router.push(`/contracts/${contractId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contract.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Contract title <span className="text-destructive">*</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="e.g. Office lease — Point Cruz"
        />
      </div>

      <div>
        <label className={labelCls}>
          Parties <span className="text-destructive">*</span>
        </label>
        <div className="space-y-2">
          {parties.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={p}
                onChange={(e) => setParties((cur) => cur.map((row, idx) => (idx === i ? e.target.value : row)))}
                className={inputCls}
                placeholder={`Party ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => setParties((cur) => cur.filter((_, idx) => idx !== i))}
                disabled={parties.length === 1}
                className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed rounded-md"
                aria-label="Remove party"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParties((cur) => [...cur, ""])}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3 h-3" /> Add party
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={inputCls}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Owning department (optional)</label>
          <input
            value={owningDepartment}
            onChange={(e) => setOwningDepartment(e.target.value)}
            className={inputCls}
            placeholder="e.g. Finance, IT"
          />
        </div>
        <div>
          <label className={labelCls}>Start date <span className="text-destructive">*</span></label>
          <DateField value={startDate} onChange={setStartDate} />
        </div>
        <div>
          <label className={labelCls}>End date <span className="text-destructive">*</span></label>
          <DateField value={endDate} onChange={setEndDate} />
        </div>
        <div>
          <label className={labelCls}>Contract value</label>
          <AmountInput
            value={contractValue}
            onChange={(e) => setContractValue(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <div>
          <label className={labelCls}>Attach signed contract (optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            You can also upload documents after the contract is registered.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={signedDocType}
              onChange={(e) => setSignedDocType(e.target.value)}
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

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/contracts")}
          className="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Register contract"}
        </button>
      </div>
    </div>
  );
}

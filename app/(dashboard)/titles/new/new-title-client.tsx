"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, AlertTriangle, ArrowRight } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { createTitle } from "@/app/actions/create-title";
import { TITLE_OWNERSHIP_TYPE_LABELS } from "@/lib/title-utils";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const DOC_TYPES = [
  { value: "title_deed", label: "Title deed" },
  { value: "certificate_of_title", label: "Certificate of title" },
  { value: "survey_plan", label: "Survey plan" },
  { value: "encumbrance_document", label: "Encumbrance document" },
  { value: "other", label: "Other" },
];

const DUPLICATE_PREFIX = "DUPLICATE_TITLE_NUMBER:";

export default function NewTitleClient() {
  const router = useRouter();
  const [titleNumber, setTitleNumber] = useState("");
  const [location, setLocation] = useState("");
  const [ownershipType, setOwnershipType] = useState<
    "perpetual_estate" | "fixed_term_estate" | "leasehold_interest" | "other"
  >("perpetual_estate");
  const [registeredOwner, setRegisteredOwner] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [initialDocType, setInitialDocType] = useState("title_deed");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFixedTerm = ownershipType === "fixed_term_estate";
  const canSubmit =
    titleNumber.trim().length >= 1 &&
    location.trim().length >= 2 &&
    (!isFixedTerm || (!!termStart && !!termEnd && termEnd > termStart));

  async function submit() {
    setError(null);
    setDuplicateId(null);
    if (!canSubmit) {
      setError(
        isFixedTerm && (!termStart || !termEnd)
          ? "Fixed-term estates require both a start and end date."
          : "Fill in title number, location, and ownership details.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("titleNumber", titleNumber.trim());
      formData.append("location", location.trim());
      formData.append("ownershipType", ownershipType);
      if (registeredOwner.trim())
        formData.append("registeredOwner", registeredOwner.trim());
      if (isFixedTerm) {
        formData.append("termStart", termStart);
        formData.append("termEnd", termEnd);
      }
      if (notes.trim()) formData.append("notes", notes.trim());
      const files = fileRef.current?.files;
      if (files) {
        Array.from(files).forEach((f) => {
          formData.append("files", f);
          formData.append("fileDocTypes", initialDocType);
        });
      }
      const { titleId } = await createTitle(formData);
      router.push(`/titles/${titleId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to register title.";
      const dupIdx = msg.indexOf(DUPLICATE_PREFIX);
      if (dupIdx !== -1) {
        setDuplicateId(msg.slice(dupIdx + DUPLICATE_PREFIX.length).trim());
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
            Title number <span className="text-destructive">*</span>
          </label>
          <input
            value={titleNumber}
            onChange={(e) => setTitleNumber(e.target.value)}
            className={inputCls}
            placeholder="e.g. LR/PE/2021/045"
          />
        </div>
        <div>
          <label className={labelCls}>Registered owner (optional)</label>
          <input
            value={registeredOwner}
            onChange={(e) => setRegisteredOwner(e.target.value)}
            className={inputCls}
            placeholder="e.g. SINPF Nominees Ltd (if held via trustee)"
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>
            Location <span className="text-destructive">*</span>
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            placeholder="Property location or address"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Ownership type <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(
            Object.entries(TITLE_OWNERSHIP_TYPE_LABELS) as [
              typeof ownershipType,
              string,
            ][]
          ).map(([v, l]) => (
            <label
              key={v}
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                ownershipType === v
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="ownershipType"
                checked={ownershipType === v}
                onChange={() => setOwnershipType(v)}
              />
              <span className="text-sm font-medium text-foreground">{l}</span>
            </label>
          ))}
        </div>
      </div>

      {isFixedTerm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md border border-warning/40 bg-warning/5">
          <div>
            <label className={labelCls}>
              Term start <span className="text-destructive">*</span>
            </label>
            <DateField value={termStart} onChange={setTermStart} />
          </div>
          <div>
            <label className={labelCls}>
              Term end <span className="text-destructive">*</span>
            </label>
            <DateField value={termEnd} onChange={setTermEnd} />
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Fixed-term estates expire; both dates are required so the register
            can track the legal risk.
          </p>
        </div>
      )}

      <div>
        <label className={labelCls}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputCls} min-h-20`}
          placeholder="Any additional context about the title."
        />
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <div>
          <label className={labelCls}>Attach documents (optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Title deeds, survey plans and other supporting material.
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

      {duplicateId && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/40 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-semibold text-destructive">
                A title with number {titleNumber} already exists.
              </p>
              <p className="mt-1 text-muted-foreground">
                Title numbers are unique across the register. Open the existing
                title to review it, then change the number here if this is a
                different title.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Link
              href={`/titles/${duplicateId}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              Open existing title <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
          onClick={() => router.push("/titles")}
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
          {submitting ? "Saving…" : "Register title"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Save, X, Plus } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { createLegalOpinion } from "@/app/actions/create-legal-opinion";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const DOC_TYPES = [
  { value: "signed_opinion", label: "Signed opinion" },
  { value: "draft_opinion", label: "Draft opinion" },
  { value: "supporting_material", label: "Supporting material" },
  { value: "other", label: "Other" },
];

type Author = { id: string; name: string; email: string };
type Parent = {
  id: string;
  opinionRef: string;
  subjectMatter: string;
  requestingDepartment: string;
  summary: string | null;
  keywords: string[];
  authorId: string;
} | null;

export default function NewLegalOpinionClient({
  me,
  authors,
  departments,
  parent,
}: {
  me: { id: string };
  authors: Author[];
  departments: string[];
  parent: Parent;
}) {
  const router = useRouter();
  const [subjectMatter, setSubjectMatter] = useState(parent?.subjectMatter ?? "");
  const [requestingDepartment, setRequestingDepartment] = useState(
    parent?.requestingDepartment ?? "",
  );
  const [authorId, setAuthorId] = useState(parent?.authorId ?? me.id);
  const [opinionDate, setOpinionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateRequested, setDateRequested] = useState("");
  const [summary, setSummary] = useState(parent?.summary ?? "");
  const [keywords, setKeywords] = useState<string[]>(parent?.keywords ?? []);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [initialDocType, setInitialDocType] = useState("signed_opinion");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const canSubmit =
    subjectMatter.trim().length >= 2 &&
    requestingDepartment.trim().length >= 2 &&
    !!opinionDate &&
    opinionDate <= today &&
    !!authorId;

  function commitKeywordDraft() {
    const parts = keywordDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setKeywords((cur) => Array.from(new Set([...cur, ...parts])));
    setKeywordDraft("");
  }

  function removeKeyword(k: string) {
    setKeywords((cur) => cur.filter((x) => x !== k));
  }

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError(
        opinionDate > today
          ? "Opinion date cannot be in the future."
          : "Fill in subject, department, author, and a valid opinion date.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subjectMatter", subjectMatter.trim());
      formData.append("requestingDepartment", requestingDepartment.trim());
      formData.append("opinionDate", opinionDate);
      if (dateRequested) formData.append("dateRequested", dateRequested);
      formData.append("authorId", authorId);
      if (summary.trim()) formData.append("summary", summary.trim());
      for (const k of keywords) formData.append("keywords", k);
      if (parent) formData.append("supersedesOpinionId", parent.id);
      const files = fileRef.current?.files;
      if (files) {
        Array.from(files).forEach((f) => {
          formData.append("files", f);
          formData.append("fileDocTypes", initialDocType);
        });
      }
      const { opinionId } = await createLegalOpinion(formData);
      router.push(`/legal-opinions/${opinionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save opinion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>
          Subject matter <span className="text-destructive">*</span>
        </label>
        <input
          value={subjectMatter}
          onChange={(e) => setSubjectMatter(e.target.value)}
          className={inputCls}
          placeholder="e.g. Whether surcharge accrual continues after wage garnishment order"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Requesting department <span className="text-destructive">*</span>
          </label>
          <input
            list="lo-dept-list"
            value={requestingDepartment}
            onChange={(e) => setRequestingDepartment(e.target.value)}
            className={inputCls}
            placeholder="e.g. Finance, Investment, HR"
          />
          <datalist id="lo-dept-list">
            {departments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>
            Author <span className="text-destructive">*</span>
          </label>
          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            className={inputCls}
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date requested (optional)</label>
          <DateField value={dateRequested} onChange={setDateRequested} />
        </div>
        <div>
          <label className={labelCls}>
            Opinion date <span className="text-destructive">*</span>
          </label>
          <DateField value={opinionDate} onChange={setOpinionDate} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Summary (optional)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={`${inputCls} min-h-24`}
          placeholder="A short conclusion so reusable advice can be assessed without opening the attachment."
        />
      </div>

      <div>
        <label className={labelCls}>Keywords</label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold bg-muted text-foreground"
            >
              #{k}
              <button
                type="button"
                onClick={() => removeKeyword(k)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove keyword ${k}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No keywords yet. Add commas to enter several at once.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitKeywordDraft();
              }
            }}
            className={inputCls}
            placeholder="e.g. surcharge, garnishment, tenure"
          />
          <button
            type="button"
            onClick={commitKeywordDraft}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <div>
          <label className={labelCls}>
            Attach opinion documents{parent ? "" : " (optional)"}
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            {parent
              ? "A new signed opinion is required before this correction can be finalised."
              : "A signed opinion document is required before finalisation."}
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

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(parent ? `/legal-opinions/${parent.id}` : "/legal-opinions")
          }
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
          {submitting ? "Saving…" : parent ? "Save superseding opinion" : "Record opinion"}
        </button>
      </div>
    </div>
  );
}

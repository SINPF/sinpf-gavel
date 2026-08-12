"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  Upload,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Link2,
  Lock,
} from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import {
  TITLE_OWNERSHIP_TYPE_LABELS,
  ENCUMBRANCE_TYPE_LABELS,
  ENCUMBRANCE_STATE_LABELS,
  TITLE_DOCUMENT_TYPE_LABELS,
  type TitleOwnershipType,
  type EncumbranceType,
  type EncumbranceState,
  type TitleDocumentType,
} from "@/lib/title-utils";
import { updateTitle } from "@/app/actions/update-title";
import { createEncumbrance } from "@/app/actions/create-encumbrance";
import { updateEncumbrance } from "@/app/actions/update-encumbrance";
import { dischargeEncumbrance } from "@/app/actions/discharge-encumbrance";
import {
  uploadTitleDocument,
  withdrawTitleDocument,
} from "@/app/actions/upload-title-document";

type Title = {
  id: string;
  titleNumber: string;
  location: string;
  ownershipType: string;
  registeredOwner: string | null;
  termStart: string | null;
  termEnd: string | null;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type Encumbrance = {
  id: string;
  titleId: string;
  encumbranceType: string;
  holderName: string;
  registeredDate: string;
  expiryDate: string | null;
  state: string;
  dischargedDate: string | null;
  dischargedBy: string | null;
  dischargerName: string | null;
  dischargeReason: string | null;
  linkedContractId: string | null;
  version: number;
  createdAt: Date;
};

type Attachment = {
  id: string;
  titleId: string;
  encumbranceId: string | null;
  fileName: string;
  fileType: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date;
  isWithdrawn: boolean;
  presignedUrl?: string;
};

type LinkedContract = {
  id: string;
  contractRef: string;
  title: string;
  contractType: string;
  endDate: string;
  terminatedDate: string | null;
};

type Permissions = {
  update: boolean;
  recordEncumbrance: boolean;
  updateEncumbrance: boolean;
  dischargeEncumbrance: boolean;
  upload: boolean;
  withdraw: boolean;
};

const ENC_STATE_STYLES: Record<EncumbranceState, string> = {
  active: "bg-warning/15 text-warning",
  discharged: "bg-muted-foreground text-background",
};

const ENC_DOC_TYPES: { value: string; label: string }[] = [
  { value: "encumbrance_document", label: "Encumbrance document" },
  { value: "discharge_document", label: "Discharge document" },
  { value: "other", label: "Other" },
];

const TITLE_DOC_TYPES: { value: string; label: string }[] = [
  { value: "title_deed", label: "Title deed" },
  { value: "certificate_of_title", label: "Certificate of title" },
  { value: "survey_plan", label: "Survey plan" },
  { value: "encumbrance_document", label: "Encumbrance document" },
  { value: "other", label: "Other" },
];

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "d MMM yyyy") : v;
}
function fmtDateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return isValid(d) ? format(d, "d MMM yyyy · HH:mm") : String(v);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{children}</p>
    </div>
  );
}

// ─── Title edit panel ────────────────────────────────────────────────────────

function TitleEditPanel({
  title,
  onClose,
}: {
  title: Title;
  onClose: () => void;
}) {
  const router = useRouter();
  const [titleNumber, setTitleNumber] = useState(title.titleNumber);
  const [location, setLocation] = useState(title.location);
  const [ownershipType, setOwnershipType] = useState(title.ownershipType);
  const [registeredOwner, setRegisteredOwner] = useState(
    title.registeredOwner ?? "",
  );
  const [termStart, setTermStart] = useState(title.termStart ?? "");
  const [termEnd, setTermEnd] = useState(title.termEnd ?? "");
  const [notes, setNotes] = useState(title.notes ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFixedTerm = ownershipType === "fixed_term_estate";

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give a reason for this update (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await updateTitle({
        id: title.id,
        version: title.version,
        titleNumber: titleNumber.trim(),
        location: location.trim(),
        ownershipType,
        registeredOwner: registeredOwner.trim() || null,
        termStart: isFixedTerm ? termStart || null : null,
        termEnd: isFixedTerm ? termEnd || null : null,
        notes: notes.trim() || null,
        reason: reason.trim(),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card border border-primary/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">Edit title</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Title number</label>
          <input
            value={titleNumber}
            onChange={(e) => setTitleNumber(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Registered owner</label>
          <input
            value={registeredOwner}
            onChange={(e) => setRegisteredOwner(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Ownership type</label>
          <select
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value)}
            className={inputCls}
          >
            {Object.entries(TITLE_OWNERSHIP_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {isFixedTerm && (
          <>
            <div>
              <label className={labelCls}>Term start</label>
              <DateField value={termStart} onChange={setTermStart} />
            </div>
            <div>
              <label className={labelCls}>Term end</label>
              <DateField value={termEnd} onChange={setTermEnd} />
            </div>
          </>
        )}
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputCls} min-h-20`}
        />
      </div>

      <div>
        <label className={labelCls}>
          Reason for update <span className="text-destructive">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`${inputCls} min-h-20`}
          placeholder="What is being changed and why?"
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Encumbrance create panel ────────────────────────────────────────────────

function AddEncumbrancePanel({
  titleId,
  onClose,
}: {
  titleId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [encumbranceType, setEncumbranceType] =
    useState<EncumbranceType>("lease");
  const [holderName, setHolderName] = useState("");
  const [registeredDate, setRegisteredDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [linkedContractId, setLinkedContractId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (holderName.trim().length < 2 || !registeredDate) {
      setError("Holder name and registered date are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createEncumbrance({
        titleId,
        encumbranceType,
        holderName: holderName.trim(),
        registeredDate,
        expiryDate: expiryDate || null,
        linkedContractId: linkedContractId.trim() || null,
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add encumbrance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card border border-primary/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Record encumbrance
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={encumbranceType}
            onChange={(e) =>
              setEncumbranceType(e.target.value as EncumbranceType)
            }
            className={inputCls}
          >
            {Object.entries(ENCUMBRANCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Holder</label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className={inputCls}
            placeholder="Party holding the interest"
          />
        </div>
        <div>
          <label className={labelCls}>Registered date</label>
          <DateField value={registeredDate} onChange={setRegisteredDate} />
        </div>
        <div>
          <label className={labelCls}>Expiry date (optional)</label>
          <DateField value={expiryDate} onChange={setExpiryDate} />
        </div>
        {encumbranceType === "lease" && (
          <div className="md:col-span-2">
            <label className={labelCls}>Linked contract id (optional)</label>
            <input
              value={linkedContractId}
              onChange={(e) => setLinkedContractId(e.target.value)}
              className={inputCls}
              placeholder="Contract id, if this lease corresponds to a registered contract"
            />
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Record encumbrance"}
        </button>
      </div>
    </div>
  );
}

// ─── Encumbrance edit / discharge inline panels ──────────────────────────────

function EncumbranceEditPanel({
  encumbrance,
  onClose,
}: {
  encumbrance: Encumbrance;
  onClose: () => void;
}) {
  const router = useRouter();
  const [encumbranceType, setEncumbranceType] = useState<EncumbranceType>(
    encumbrance.encumbranceType as EncumbranceType,
  );
  const [holderName, setHolderName] = useState(encumbrance.holderName);
  const [registeredDate, setRegisteredDate] = useState(encumbrance.registeredDate);
  const [expiryDate, setExpiryDate] = useState(encumbrance.expiryDate ?? "");
  const [linkedContractId, setLinkedContractId] = useState(
    encumbrance.linkedContractId ?? "",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give a reason (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await updateEncumbrance({
        id: encumbrance.id,
        version: encumbrance.version,
        encumbranceType,
        holderName: holderName.trim(),
        registeredDate,
        expiryDate: expiryDate || null,
        linkedContractId: linkedContractId.trim() || null,
        reason: reason.trim(),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 ml-7 p-3 rounded-md border border-primary/30 bg-primary/5 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={encumbranceType}
            onChange={(e) =>
              setEncumbranceType(e.target.value as EncumbranceType)
            }
            className={inputCls}
          >
            {Object.entries(ENCUMBRANCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Holder</label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Registered date</label>
          <DateField value={registeredDate} onChange={setRegisteredDate} />
        </div>
        <div>
          <label className={labelCls}>Expiry date</label>
          <DateField value={expiryDate} onChange={setExpiryDate} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Linked contract id</label>
          <input
            value={linkedContractId}
            onChange={(e) => setLinkedContractId(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>
          Reason for update <span className="text-destructive">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`${inputCls} min-h-16`}
          placeholder="10 characters minimum"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-2 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function DischargePanel({
  encumbrance,
  onClose,
}: {
  encumbrance: Encumbrance;
  onClose: () => void;
}) {
  const router = useRouter();
  const [dischargedDate, setDischargedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!files || files.length === 0) {
      setError("Attach the supporting discharge document.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Give a reason (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("id", encumbrance.id);
      fd.append("version", String(encumbrance.version));
      fd.append("dischargedDate", dischargedDate);
      fd.append("reason", reason.trim());
      Array.from(files).forEach((f) => fd.append("files", f));
      await dischargeEncumbrance(fd);
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discharge failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 ml-7 p-3 rounded-md border border-destructive/30 bg-destructive/5 space-y-3">
      <p className="text-xs text-foreground">
        Discharge is <span className="font-semibold">irreversible</span>. The
        encumbrance will remain visible in history but can no longer be edited.
      </p>
      <div>
        <label className="block text-xs font-semibold text-destructive">
          Discharge date
        </label>
        <DateField value={dischargedDate} onChange={setDischargedDate} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-destructive">
          Supporting document
        </label>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-destructive">
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`${inputCls} min-h-16`}
          placeholder="10 characters minimum"
        />
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-2 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {submitting ? "Discharging…" : "Confirm discharge"}
        </button>
      </div>
    </div>
  );
}

// ─── Encumbrances panel ──────────────────────────────────────────────────────

function EncumbrancesPanel({
  titleId,
  encumbrancesData,
  permissions,
}: {
  titleId: string;
  encumbrancesData: Encumbrance[];
  permissions: Permissions;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dischargingId, setDischargingId] = useState<string | null>(null);

  const active = encumbrancesData.filter((e) => e.state === "active");
  const discharged = encumbrancesData.filter((e) => e.state === "discharged");

  function EncumbranceRow({ enc }: { enc: Encumbrance }) {
    const isActive = enc.state === "active";
    return (
      <li className="py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            {isActive ? (
              <ShieldAlert className="w-4 h-4 text-warning" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-foreground">
                {ENCUMBRANCE_TYPE_LABELS[enc.encumbranceType as EncumbranceType]}
              </span>
              <span className="text-sm font-medium text-foreground">
                {enc.holderName}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold ${
                  ENC_STATE_STYLES[enc.state as EncumbranceState]
                }`}
              >
                {ENCUMBRANCE_STATE_LABELS[enc.state as EncumbranceState]}
              </span>
              {enc.linkedContractId && (
                <Link
                  href={`/contracts/${enc.linkedContractId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Link2 className="w-3 h-3" /> Contract
                </Link>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
              Registered {fmtDate(enc.registeredDate)}
              {enc.expiryDate ? ` · Expires ${fmtDate(enc.expiryDate)}` : ""}
              {enc.state === "discharged"
                ? ` · Discharged ${fmtDate(enc.dischargedDate)}${
                    enc.dischargerName ? ` by ${enc.dischargerName}` : ""
                  }`
                : ""}
            </div>
            {enc.state === "discharged" && enc.dischargeReason && (
              <p className="mt-1 text-xs text-foreground italic">
                {enc.dischargeReason}
              </p>
            )}
          </div>
          {isActive && permissions.updateEncumbrance && editingId !== enc.id && (
            <button
              onClick={() => {
                setEditingId(enc.id);
                setDischargingId(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {isActive && permissions.dischargeEncumbrance && dischargingId !== enc.id && (
            <button
              onClick={() => {
                setDischargingId(enc.id);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Discharge
            </button>
          )}
        </div>
        {editingId === enc.id && (
          <EncumbranceEditPanel
            encumbrance={enc}
            onClose={() => setEditingId(null)}
          />
        )}
        {dischargingId === enc.id && (
          <DischargePanel
            encumbrance={enc}
            onClose={() => setDischargingId(null)}
          />
        )}
      </li>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Encumbrances
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {active.length} active · {discharged.length} discharged
          </span>
          {permissions.recordEncumbrance && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add encumbrance
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="mb-4">
          <AddEncumbrancePanel titleId={titleId} onClose={() => setAdding(false)} />
        </div>
      )}

      {encumbrancesData.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No encumbrances registered against this title.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-1">
                Active
              </p>
              <ul className="divide-y divide-border">
                {active.map((enc) => (
                  <EncumbranceRow key={enc.id} enc={enc} />
                ))}
              </ul>
            </div>
          )}
          {discharged.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-1">
                Discharged history
              </p>
              <ul className="divide-y divide-border">
                {discharged.map((enc) => (
                  <EncumbranceRow key={enc.id} enc={enc} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Linked contracts panel ──────────────────────────────────────────────────

function LinkedContractsPanel({
  contractsData,
}: {
  contractsData: LinkedContract[];
}) {
  if (contractsData.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Linked contracts
        </h2>
        <span className="text-xs text-muted-foreground">
          {contractsData.length} linked
        </span>
      </div>
      <ul className="divide-y divide-border">
        {contractsData.map((c) => {
          const isTerminated = !!c.terminatedDate;
          return (
            <li key={c.id} className="py-3 flex items-center gap-3">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <Link
                href={`/contracts/${c.id}`}
                className="flex-1 min-w-0 hover:underline"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {c.contractRef}
                  </span>
                  <span className="text-sm text-foreground truncate">
                    {c.title}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  Ends {fmtDate(c.endDate)}
                  {isTerminated ? ` · Terminated ${fmtDate(c.terminatedDate)}` : ""}
                </span>
              </Link>
              {isTerminated && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-destructive/10 text-destructive">
                  Terminated
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Documents panel ─────────────────────────────────────────────────────────

function DocumentsPanel({
  titleId,
  documents,
  canUpload,
  canWithdraw,
}: {
  titleId: string;
  documents: Attachment[];
  canUpload: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState("title_deed");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  async function submit() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("titleId", titleId);
      fd.append("documentType", docType);
      Array.from(selectedFiles).forEach((f) => fd.append("files", f));
      await uploadTitleDocument(fd);
      setSelectedFiles(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function startWithdraw(id: string) {
    setWithdrawingId(id);
    setWithdrawReason("");
    setWithdrawError(null);
  }
  function cancelWithdraw() {
    setWithdrawingId(null);
    setWithdrawReason("");
    setWithdrawError(null);
  }
  async function confirmWithdraw() {
    if (!withdrawingId) return;
    if (withdrawReason.trim().length < 10) {
      setWithdrawError("Give a reason (10 chars minimum).");
      return;
    }
    setWithdrawError(null);
    setWithdrawSubmitting(true);
    try {
      await withdrawTitleDocument({
        documentId: withdrawingId,
        reason: withdrawReason.trim(),
      });
      cancelWithdraw();
      router.refresh();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Documents</h2>
        <span className="text-xs text-muted-foreground">
          {documents.length} file(s)
        </span>
      </div>

      {canUpload && (
        <div className="mb-4 p-3 rounded-md border border-dashed border-border bg-muted/30 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={`${inputCls} max-w-xs`}
            >
              {TITLE_DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="text-sm"
            />
            <button
              onClick={submit}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {d.fileName}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold uppercase bg-muted text-muted-foreground">
                      {TITLE_DOCUMENT_TYPE_LABELS[
                        d.documentType as TitleDocumentType
                      ] ?? d.documentType}
                    </span>
                    {d.encumbranceId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        <Link2 className="w-3 h-3" /> Encumbrance
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {fmtDateTime(d.uploadedAt)}
                  </span>
                </span>
                {d.presignedUrl && (
                  <a
                    href={d.presignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                )}
                {canWithdraw && withdrawingId !== d.id && (
                  <button
                    onClick={() => startWithdraw(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                )}
              </div>
              {canWithdraw && withdrawingId === d.id && (
                <div className="mt-3 ml-7 p-3 rounded-md border border-destructive/30 bg-destructive/5 space-y-2">
                  <label className="block text-xs font-semibold text-destructive">
                    Reason for withdrawing this document
                  </label>
                  <textarea
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className={`${inputCls} min-h-16`}
                    placeholder="10 characters minimum"
                    autoFocus
                  />
                  {withdrawError && (
                    <p className="text-xs text-destructive font-medium">{withdrawError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelWithdraw}
                      disabled={withdrawSubmitting}
                      className="px-2 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmWithdraw}
                      disabled={withdrawSubmitting}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {withdrawSubmitting ? "Withdrawing…" : "Confirm withdraw"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TitleDetailClient({
  title,
  encumbrancesData,
  documents,
  linkedContracts,
  permissions,
}: {
  title: Title;
  encumbrancesData: Encumbrance[];
  documents: Attachment[];
  linkedContracts: LinkedContract[];
  permissions: Permissions;
}) {
  const [editing, setEditing] = useState(false);
  const ownership = title.ownershipType as TitleOwnershipType;
  const isFixedTerm = ownership === "fixed_term_estate";
  const activeEncCount = encumbrancesData.filter((e) => e.state === "active").length;

  const today = new Date().toISOString().slice(0, 10);
  const expiring =
    isFixedTerm &&
    title.termEnd &&
    title.termEnd >= today &&
    title.termEnd <=
      new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  const expired = isFixedTerm && title.termEnd && title.termEnd < today;

  return (
    <div className="space-y-6">
      <Link
        href="/titles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to titles
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Title
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight tabular-nums">
            {title.titleNumber}
          </h1>
          <p className="mt-1 text-lg text-foreground">{title.location}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold bg-primary text-white">
            {TITLE_OWNERSHIP_TYPE_LABELS[ownership]}
          </span>
          {activeEncCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/15 text-warning">
              <ShieldAlert className="w-3.5 h-3.5" />
              {activeEncCount} active encumbrance{activeEncCount === 1 ? "" : "s"}
            </span>
          )}
          {expiring && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/10 text-warning">
              <AlertCircle className="w-3.5 h-3.5" />
              Term ends {fmtDate(title.termEnd)}
            </span>
          )}
          {expired && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-destructive/10 text-destructive">
              <Lock className="w-3.5 h-3.5" />
              Term expired {fmtDate(title.termEnd)}
            </span>
          )}
          {permissions.update && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && <TitleEditPanel title={title} onClose={() => setEditing(false)} />}

      {/* Overview */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Title number">{title.titleNumber}</Field>
          <Field label="Ownership">
            {TITLE_OWNERSHIP_TYPE_LABELS[ownership]}
          </Field>
          <Field label="Registered owner">{title.registeredOwner ?? "—"}</Field>
          <Field label="Location">{title.location}</Field>
          {isFixedTerm && (
            <>
              <Field label="Term start">{fmtDate(title.termStart)}</Field>
              <Field label="Term end">{fmtDate(title.termEnd)}</Field>
            </>
          )}
          <Field label="Created">{fmtDateTime(title.createdAt)}</Field>
          <Field label="Updated">{fmtDateTime(title.updatedAt)}</Field>
        </div>
        {title.notes && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
              Notes
            </p>
            <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
              {title.notes}
            </p>
          </div>
        )}
      </div>

      <EncumbrancesPanel
        titleId={title.id}
        encumbrancesData={encumbrancesData}
        permissions={permissions}
      />

      <LinkedContractsPanel contractsData={linkedContracts} />

      <DocumentsPanel
        titleId={title.id}
        documents={documents}
        canUpload={permissions.upload}
        canWithdraw={permissions.withdraw}
      />
    </div>
  );
}

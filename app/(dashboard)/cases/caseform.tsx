"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { insertCaseSchema, CaseFormValues } from "@/db/validator";
import { createCase } from "@/app/actions/create-case";
import { authClient } from "@/lib/auth-client";
import General from "./caseform-general";
import CaseTypes from "./caseform-case-types";
import UploadFiles from "./caseform-upload-files";
import Assignment from "./caseform-assignment";

const TABS = [
  { step: "1", label: "Employer and Referral Date" },
  { step: "2", label: "Case Type and Claim Amount" },
  { step: "3", label: "Supporting Documents" },
  { step: "4", label: "Assignment" },
];

function CaseFormHeader({
  onClose,
  onToggleExpand,
  isMaximized,
}: {
  onClose: () => void;
  onToggleExpand: () => void;
  isMaximized: boolean;
}) {
  return (
    <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border bg-muted/30">
      <h2 className="font-serif text-xl font-semibold text-foreground tracking-tight">
        Create new case referral
      </h2>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          {isMaximized
            ? <Minimize2 className="w-4 h-4" />
            : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function TabBar({
  activeTab,
  onSelect,
  canNavigateTo,
}: {
  activeTab: number;
  onSelect: (i: number) => void;
  canNavigateTo: (i: number) => boolean;
}) {
  return (
    <div className="shrink-0 flex border-b border-border bg-background">
      {TABS.map(({ step, label }, i) => {
        const isActive  = activeTab === i;
        const isEnabled = canNavigateTo(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => isEnabled && onSelect(i)}
            disabled={!isEnabled}
            className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-primary text-primary"
                : isEnabled
                ? "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                : "border-transparent text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <span className="tabular-nums">{step}.</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GrandTotalBanner({ total }: { total: number }) {
  return (
    <div className="relative rounded-md overflow-hidden p-5 bg-card border border-primary/30">
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Grand total claim
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Auto-calculated · SBD</p>
        </div>
        <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">
          {total.toLocaleString("en-AU", {
            style: "currency",
            currency: "SBD",
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

export default function CaseForm({ onClose }: { onClose: () => void }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab,   setActiveTab]   = useState(0);
  const [files,       setFiles]       = useState<File[]>([]);
  const [error,       setError]       = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(insertCaseSchema) as Resolver<CaseFormValues>,
    defaultValues: {
      employerId:         "",
      referralDate:       format(new Date(), "yyyy-MM-dd"),
      selectedTypes:      [],
      // Amount fields start empty rather than at 0 so the placeholder shows
      // and the user doesn't have to clear a "0" before typing.
      totalContributions: undefined as unknown as number,
      totalSurcharges:    undefined as unknown as number,
      wagesRecord:        undefined as unknown as number,
      grandTotalClaim:    0,
      assignedTo:         "",
    },
  });

  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? null;

  const selectedTypes   = watch("selectedTypes") ?? [];
  const employerId      = watch("employerId")         as string ?? "";
  const referralDate    = watch("referralDate")       as string ?? "";
  const contributions   = watch("totalContributions") as number || 0;
  const surcharges      = watch("totalSurcharges")    as number || 0;
  const wages           = watch("wagesRecord")        as number || 0;
  const assignedTo      = watch("assignedTo")         as string ?? "";

  // Default the assignee to the current user once the session resolves.
  useEffect(() => {
    if (currentUserId && !assignedTo) {
      setValue("assignedTo", currentUserId);
    }
  }, [currentUserId, assignedTo, setValue]);

  const grandTotal = contributions + surcharges + wages;

  // Tab 1 gate: employer selected + date set
  const tab1Valid = !!employerId && !!referralDate;

  // Tab 2 gate: at least one type, and every monetary type has a positive amount.
  // "Wages record" is evidence-only (no claim amount), so it has no amount requirement.
  const isContributionsSelected  = selectedTypes.includes("Unpaid contributions");
  const isSurchargesSelected     = selectedTypes.includes("Unpaid surcharges");

  const contributionsOk = !isContributionsSelected || contributions > 0;
  const surchargesOk    = !isSurchargesSelected    || surcharges    > 0;

  const tab2Valid = selectedTypes.length > 0 && contributionsOk && surchargesOk;

  // Tab 3: documents are optional across the whole referral
  const tab3Valid = true;

  // Tab 4: an assignee must be selected (defaults to current user)
  const tab4Valid = !!assignedTo;

  const canNavigateTo = (i: number) =>
    i === 0 ||
    (i === 1 && tab1Valid) ||
    (i === 2 && tab1Valid && tab2Valid) ||
    (i === 3 && tab1Valid && tab2Valid);

  const isLastTab = activeTab === TABS.length - 1;

  // Guard for the "Next" button — checks the *current* tab is valid before advancing
  const canAdvance =
    activeTab === 0 ? tab1Valid :
    activeTab === 1 ? tab2Valid :
    activeTab === 2 ? tab3Valid :
    false;

  const onSubmit = async (data: CaseFormValues) => {
    // Only accept submission from the final tab — blocks Enter-key implicit
    // submits and any other stray submit triggers on earlier tabs.
    if (activeTab !== TABS.length - 1) return;
    if (!tab2Valid || !tab3Valid || !tab4Valid) return;
    setError(null);
    try {
      const formData = new FormData();
      formData.append("employerId",          data.employerId);
      formData.append("referralDate",        data.referralDate ?? "");
      const amt = (v: unknown) => (Number.isFinite(Number(v)) ? String(Number(v)) : "0");
      formData.append("totalContributions",  amt(data.totalContributions));
      formData.append("totalSurcharges",     amt(data.totalSurcharges));
      formData.append("wagesRecord",         amt(data.wagesRecord));
      formData.append("grandTotalClaim",     String(grandTotal));
      formData.append("assignedTo",          data.assignedTo ?? "");
      data.selectedTypes.forEach((t) => formData.append("selectedTypes", t));
      files.forEach((f) => formData.append("files", f));
      await createCase(formData);
      onClose();
    } catch {
      setError("Failed to save case. Please try again.");
    }
  };

  return (
    <div
      className={`relative bg-card rounded-md border border-border shadow-lg z-10 overflow-hidden flex flex-col transition-all duration-300 ${
        isMaximized ? "w-full h-full rounded-none" : "w-5/6 h-5/6"
      }`}
    >
      <CaseFormHeader
        onClose={onClose}
        onToggleExpand={() => setIsMaximized(!isMaximized)}
        isMaximized={isMaximized}
      />

      <TabBar activeTab={activeTab} onSelect={setActiveTab} canNavigateTo={canNavigateTo} />

      <form onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-linear-to-br from-background via-blue-50 to-blue-100">
        <div className="flex-1 p-6 animate-in fade-in duration-200 space-y-6">
          {activeTab === 0 && (
            <General register={register} setValue={setValue} watch={watch} />
          )}

          {activeTab === 1 && (
            <>
              <CaseTypes
                control={control}
                register={register}
                setValue={setValue}
              />
              {selectedTypes.length > 0 && (
                <GrandTotalBanner total={grandTotal} />
              )}
            </>
          )}

          {activeTab === 2 && (
            <UploadFiles files={files} setFiles={setFiles} />
          )}

          {activeTab === 3 && (
            <Assignment
              value={assignedTo}
              onChange={(id) => setValue("assignedTo", id, { shouldValidate: true })}
              currentUserId={currentUserId}
            />
          )}

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-end items-center gap-4">
          <div className="flex items-center gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab((t) => t - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {!isLastTab ? (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => setActiveTab((t) => t + 1)}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  canAdvance
                    ? "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={!tab2Valid || !tab4Valid || isSubmitting}
                className={`px-8 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  tab2Valid && tab4Valid && !isSubmitting
                    ? "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Adding…" : "Add referral"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

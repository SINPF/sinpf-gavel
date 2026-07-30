"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { insertCaseSchema, CaseFormValues } from "@/db/validator";
import { createCase } from "@/app/actions/create-case";
import General from "./caseform-general";
import CaseTypes, { type WagesMode } from "./caseform-case-types";

const TABS = [
  { step: "1", label: "Employer info" },
  { step: "2", label: "Case types and amounts" },
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
    <div className="relative rounded-md overflow-hidden p-5 bg-sinpf-navy border border-blue-800">
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.06em]">
            Grand total claim
          </p>
          <p className="text-xs text-white/50 mt-0.5">Auto-calculated · SBD</p>
        </div>
        <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
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
  const [wagesMode,   setWagesMode]   = useState<WagesMode>("amount");
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
      referralDate:       new Date().toISOString().split("T")[0],
      selectedTypes:      [],
      totalContributions: 0,
      totalSurcharges:    0,
      wagesRecord:        0,
      grandTotalClaim:    0,
    },
  });

  const selectedTypes   = watch("selectedTypes") ?? [];
  const employerId      = watch("employerId")         as string ?? "";
  const referralDate    = watch("referralDate")       as string ?? "";
  const contributions   = watch("totalContributions") as number || 0;
  const surcharges      = watch("totalSurcharges")    as number || 0;
  const wages           = watch("wagesRecord")        as number || 0;

  const grandTotal = contributions + surcharges + wages;

  // Tab 1 gate: employer selected + date set
  const tab1Valid = !!employerId && !!referralDate;

  // Tab 2 gate: at least one type, and each selected type satisfies its requirement
  const isWagesSelected          = selectedTypes.includes("Wages record");
  const isContributionsSelected  = selectedTypes.includes("Unpaid contributions");
  const isSurchargesSelected     = selectedTypes.includes("Unpaid surcharges");

  const contributionsOk = !isContributionsSelected || contributions > 0;
  const surchargesOk    = !isSurchargesSelected    || surcharges    > 0;
  const wagesOk         = !isWagesSelected || (
    wagesMode === "amount"    ? wages > 0 :
    wagesMode === "documents" ? files.length > 0 :
    /* both */                  wages > 0 && files.length > 0
  );

  const tab2Valid = selectedTypes.length > 0 && contributionsOk && surchargesOk && wagesOk;

  const canNavigateTo = (i: number) => i === 0 || (i === 1 && tab1Valid);

  const isLastTab = activeTab === TABS.length - 1;

  const onSubmit = async (data: CaseFormValues) => {
    if (!tab2Valid) return;
    setError(null);
    try {
      const formData = new FormData();
      formData.append("employerId",          data.employerId);
      formData.append("referralDate",        data.referralDate ?? "");
      formData.append("totalContributions",  String(data.totalContributions));
      formData.append("totalSurcharges",     String(data.totalSurcharges));
      formData.append("wagesRecord",         String(data.wagesRecord));
      formData.append("grandTotalClaim",     String(grandTotal));
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-linear-to-br from-background via-blue-50 to-blue-100">
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
                files={files}
                setFiles={setFiles}
                wagesMode={wagesMode}
                setWagesMode={setWagesMode}
              />
              {selectedTypes.length > 0 && (
                <GrandTotalBanner total={grandTotal} />
              )}
            </>
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
                disabled={!tab1Valid}
                onClick={() => setActiveTab((t) => t + 1)}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  tab1Valid
                    ? "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!tab2Valid || isSubmitting}
                className={`px-8 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  tab2Valid && !isSubmitting
                    ? "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Saving…" : "Save record"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

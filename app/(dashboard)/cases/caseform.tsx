"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Maximize2, Minimize2, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { insertCaseSchema, CaseFormValues } from "@/db/validator";
import { createCase } from "@/app/actions/create-case";
import General from "./caseform-general";
import CaseTypes, { type WagesMode } from "./caseform-case-types";

const TABS = [
  { step: "01", label: "Employer Info" },
  { step: "02", label: "Case Types & Amounts" },
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
    <header
      className="px-8 py-5 flex justify-between items-center shrink-0"
      style={{ background: "linear-gradient(135deg, #1e3d5f 0%, #162d48 100%)" }}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-brand-sky" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight leading-tight">
            Create New Case
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow animate-pulse" />
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
              Legal Filing Portal
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center justify-center"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized
            ? <Minimize2 className="w-4 h-4 active:scale-90" />
            : <Maximize2 className="w-4 h-4 active:scale-90" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 transition-all flex items-center justify-center"
          title="Close"
        >
          <X className="w-4 h-4 active:scale-90" />
        </button>
      </div>
    </header>
  );
}

function TabBar({
  activeTab,
  onSelect,
}: {
  activeTab: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="shrink-0 flex border-b border-border bg-background">
      {TABS.map(({ step, label }, i) => {
        const isActive = activeTab === i;
        const isPast   = i < activeTab;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`relative flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              isActive
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 transition-colors ${
                isActive
                  ? "bg-brand-blue text-white"
                  : isPast
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isPast ? "✓" : step}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GrandTotalBanner({ total }: { total: number }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5"
      style={{ background: "linear-gradient(135deg, #1e3d5f 0%, #162d48 60%, #112236 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 w-36 h-36 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(8,159,255,0.25) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -left-4 bottom-0 w-28 h-28 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,223,24,0.12) 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Grand Total Claim
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Auto-calculated · SBD</p>
        </div>
        <span className="text-3xl font-black text-white tracking-tight tabular-nums">
          {total.toLocaleString("en-SB", {
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
    formState: { isSubmitSuccessful, isSubmitting },
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

  const selectedTypes        = watch("selectedTypes") ?? [];
  const isWagesSelected      = selectedTypes.includes("Wages record");
  const requiresFiles        = isWagesSelected && (wagesMode === "documents" || wagesMode === "both");
  const canSave              = !requiresFiles || files.length > 0;

  const grandTotal =
    (watch("totalContributions") || 0) +
    (watch("totalSurcharges")    || 0) +
    (watch("wagesRecord")        || 0);

  const isLastTab = activeTab === TABS.length - 1;

  const onSubmit = async (data: CaseFormValues) => {
    if (!canSave) return;
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
      className={`relative bg-background rounded-2xl shadow-2xl border border-border z-10 overflow-hidden flex flex-col transition-all duration-300 ${
        isMaximized ? "w-full h-full rounded-none" : "w-5/6 h-5/6"
      }`}
    >
      <CaseFormHeader
        onClose={onClose}
        onToggleExpand={() => setIsMaximized(!isMaximized)}
        isMaximized={isMaximized}
      />

      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col min-h-0">
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
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isSubmitSuccessful ? "bg-emerald-500" : "bg-amber-400"
              } animate-pulse`}
            />
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              {isSubmitSuccessful ? "Referred" : "Draft"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab((t) => t - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {!isLastTab ? (
              <button
                type="button"
                onClick={() => setActiveTab((t) => t + 1)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-blue text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20 transition-all active:scale-95"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSave || isSubmitting}
                className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${
                  canSave && !isSubmitting
                    ? "bg-brand-blue text-white hover:bg-brand-blue/90 shadow-brand-blue/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Saving…" : "Save Record"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

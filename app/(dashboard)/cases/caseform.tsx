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
  { step: "1", label: "Employer and Referral Details" },
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
          {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
        const isActive = activeTab === i;
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
            Total claimed
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
  const [activeTab, setActiveTab] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      employerId: "",
      referralDate: format(new Date(), "yyyy-MM-dd"),
      dateReceived: format(new Date(), "yyyy-MM-dd"),
      selectedTypes: [],
      contributionAmount: null,
      surchargeAmount: null,
      wagesPeriods: null,
      periodOfDefaultFrom: null,
      periodOfDefaultTo: null,
      assignedOfficerId: null,
    },
  });

  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? null;

  // react-hook-form's watch() returns a function that can't be memoized by
  // React Compiler; the whole component skips compilation. Switching to
  // useWatch per-field would change re-render semantics, so we accept the
  // skip here and disable the rule at the call sites.
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTypes = watch("selectedTypes") ?? [];
  const employerId = watch("employerId") as string ?? "";
  const referralDate = watch("referralDate") as string ?? "";
  const contribution = (watch("contributionAmount") as number | null) ?? 0;
  const surcharge = (watch("surchargeAmount") as number | null) ?? 0;
  const assignedOfficerId = watch("assignedOfficerId") as string | null;

  useEffect(() => {
    if (currentUserId && !assignedOfficerId) {
      setValue("assignedOfficerId", currentUserId);
    }
  }, [currentUserId, assignedOfficerId, setValue]);

  const total = Number(contribution || 0) + Number(surcharge || 0);

  const tab1Valid = !!employerId && !!referralDate;

  const isContribSelected = selectedTypes.includes("unpaid_contribution");
  const isSurchargeSelected = selectedTypes.includes("unpaid_surcharge");
  const isWagesSelected = selectedTypes.includes("wages_record");

  const contribOk = !isContribSelected || (Number(contribution) > 0);
  const surchargeOk = !isSurchargeSelected || (Number(surcharge) > 0);
  const wagesOk =
    !isWagesSelected ||
    (((watch("wagesPeriods") as string | null)?.trim().length ?? 0) > 0);

  const tab2Valid = selectedTypes.length > 0 && contribOk && surchargeOk && wagesOk;
  const tab3Valid = true;
  const tab4Valid = !!assignedOfficerId;

  const canNavigateTo = (i: number) =>
    i === 0 ||
    (i === 1 && tab1Valid) ||
    (i === 2 && tab1Valid && tab2Valid) ||
    (i === 3 && tab1Valid && tab2Valid);

  const isLastTab = activeTab === TABS.length - 1;
  const canAdvance =
    activeTab === 0 ? tab1Valid : activeTab === 1 ? tab2Valid : activeTab === 2 ? tab3Valid : false;

  const onSubmit = async (data: CaseFormValues) => {
    if (activeTab !== TABS.length - 1) return;
    if (!tab2Valid || !tab4Valid) return;
    setError(null);
    try {
      const formData = new FormData();
      formData.append("employerId", data.employerId);
      formData.append("referralDate", data.referralDate ?? "");
      formData.append("dateReceived", (data.dateReceived as string) ?? data.referralDate ?? "");
      if (data.contributionAmount != null) {
        formData.append("contributionAmount", String(data.contributionAmount));
      }
      if (data.surchargeAmount != null) {
        formData.append("surchargeAmount", String(data.surchargeAmount));
      }
      if (data.wagesPeriods) formData.append("wagesPeriods", data.wagesPeriods);
      if (data.periodOfDefaultFrom) formData.append("periodOfDefaultFrom", data.periodOfDefaultFrom);
      if (data.periodOfDefaultTo) formData.append("periodOfDefaultTo", data.periodOfDefaultTo);
      if (data.assignedOfficerId) formData.append("assignedTo", data.assignedOfficerId);
      data.selectedTypes.forEach((t) => formData.append("selectedTypes", t));
      files.forEach((f) => formData.append("files", f));
      await createCase(formData);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save case. Please try again.");
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
          {activeTab === 0 && <General register={register} setValue={setValue} watch={watch} />}

          {activeTab === 1 && (
            <>
              <CaseTypes control={control} register={register} setValue={setValue} />
              {selectedTypes.length > 0 && total > 0 && <GrandTotalBanner total={total} />}
            </>
          )}

          {activeTab === 2 && <UploadFiles files={files} setFiles={setFiles} />}

          {activeTab === 3 && (
            <Assignment
              value={assignedOfficerId ?? ""}
              onChange={(id) => setValue("assignedOfficerId", id, { shouldValidate: true })}
              currentUserId={currentUserId}
            />
          )}

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>

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

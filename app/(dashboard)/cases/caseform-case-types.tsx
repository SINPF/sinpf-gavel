"use client";

import { Check } from "lucide-react";
import {
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { CaseFormValues } from "@/db/validator";
import UploadFiles from "./caseform-upload-files";

export type WagesMode = "amount" | "documents" | "both";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-brand-blue/30 bg-white text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all placeholder:text-muted-foreground/40";
const labelCls =
  "block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1.5";

const WAGES_MODES: { value: WagesMode; label: string }[] = [
  { value: "amount",    label: "Amount Only" },
  { value: "documents", label: "Documents Only" },
  { value: "both",      label: "Both" },
];

const CASE_TYPES = [
  {
    value: "Unpaid contributions" as const,
    description: "Employer has failed to remit mandatory SINPF contributions.",
    field: "totalContributions" as const,
  },
  {
    value: "Unpaid surcharges" as const,
    description: "Outstanding penalties or surcharges on overdue contributions.",
    field: "totalSurcharges" as const,
  },
  {
    value: "Wages record" as const,
    description: "Discrepancies or missing entries in the employer's wages record.",
    field: "wagesRecord" as const,
  },
];

export default function CaseTypes({
  control,
  register,
  setValue,
  files,
  setFiles,
  wagesMode,
  setWagesMode,
}: {
  control: Control<CaseFormValues>;
  register: UseFormRegister<CaseFormValues>;
  setValue: UseFormSetValue<CaseFormValues>;
  files: File[];
  setFiles: (files: File[]) => void;
  wagesMode: WagesMode;
  setWagesMode: (m: WagesMode) => void;
}) {
  return (
    <Controller
      name="selectedTypes"
      control={control}
      render={({ field }) => (
        <div className="space-y-3">
          {CASE_TYPES.map(({ value, description, field: formField }) => {
            const isActive = field.value.includes(value);
            const isWages  = value === "Wages record";

            const toggle = () => {
              if (isActive) {
                field.onChange(field.value.filter((t) => t !== value));
                setValue(formField, 0);
                if (isWages) setFiles([]);
              } else {
                field.onChange([...field.value, value]);
              }
            };

            return (
              <div
                key={value}
                className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                  isActive ? "border-brand-blue shadow-sm shadow-brand-blue/10" : "border-border"
                }`}
              >
                {/* Clickable header row */}
                <button
                  type="button"
                  onClick={toggle}
                  className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                    isActive ? "bg-brand-blue/8" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <span className={`text-sm font-bold ${isActive ? "text-brand-blue" : "text-foreground"}`}>
                      {value}
                    </span>
                    <p className={`text-xs leading-relaxed mt-0.5 ${isActive ? "text-brand-blue/70" : "text-muted-foreground"}`}>
                      {description}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    isActive ? "bg-brand-blue border-brand-blue" : "border-border"
                  }`}>
                    {isActive && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </button>

                {/* Expanded section */}
                {isActive && (
                  <div
                    className="px-5 pb-5 pt-4 border-t border-brand-blue/15 bg-brand-blue/2 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isWages ? (
                      <>
                        {/* Mode toggle */}
                        <div>
                          <label className={labelCls}>Evidence Type</label>
                          <div className="flex rounded-xl border border-border overflow-hidden">
                            {WAGES_MODES.map(({ value: mv, label }) => (
                              <button
                                key={mv}
                                type="button"
                                onClick={() => setWagesMode(mv)}
                                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                                  wagesMode === mv
                                    ? "bg-brand-blue text-white"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {(wagesMode === "amount" || wagesMode === "both") && (
                          <div>
                            <label className={labelCls}>Amount (SBD)</label>
                            <input
                              {...register("wagesRecord", { valueAsNumber: true })}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className={inputCls}
                            />
                          </div>
                        )}

                        {(wagesMode === "documents" || wagesMode === "both") && (
                          <div>
                            <label className={labelCls}>Supporting Documents</label>
                            <UploadFiles files={files} setFiles={setFiles} />
                            {files.length === 0 && (
                              <div className="mt-3 p-3 rounded-xl bg-brand-yellow/10 border border-brand-yellow/25 text-xs font-semibold text-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow animate-pulse shrink-0" />
                                At least one document is required.
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <label className={labelCls}>Amount (SBD)</label>
                        <input
                          {...register(formField, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    />
  );
}

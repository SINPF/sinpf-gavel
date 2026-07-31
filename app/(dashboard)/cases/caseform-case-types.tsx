"use client";

import { Check, Info } from "lucide-react";
import {
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { CaseFormValues } from "@/db/validator";
import { Tooltip } from "@/components/ui/Tooltip";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-primary/30 bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls =
  "block text-sm font-medium text-foreground mb-1.5";

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
}: {
  control: Control<CaseFormValues>;
  register: UseFormRegister<CaseFormValues>;
  setValue: UseFormSetValue<CaseFormValues>;
}) {
  return (
    <Controller
      name="selectedTypes"
      control={control}
      render={({ field }) => (
        <div className="space-y-3">
          {CASE_TYPES.map(({ value, description, field: formField }) => {
            const isActive        = field.value.includes(value);
            const isEvidenceOnly  = value === "Wages record";

            const toggle = () => {
              if (isActive) {
                field.onChange(field.value.filter((t) => t !== value));
                setValue(formField, 0);
              } else {
                field.onChange([...field.value, value]);
              }
            };

            return (
              <div
                key={value}
                className={`rounded-md border overflow-hidden transition-colors ${
                  isActive ? "border-primary" : "border-border"
                }`}
              >
                {/* Clickable header row */}
                <button
                  type="button"
                  onClick={toggle}
                  className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                    isActive ? "bg-blue-50" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
                    <span className={`text-sm font-semibold capitalize ${isActive ? "text-primary" : "text-foreground"}`}>
                      {value}
                    </span>
                    <Tooltip content={description}>
                      <Info className={`w-3.5 h-3.5 shrink-0 cursor-help transition-colors ${
                        isActive ? "text-primary/60 hover:text-primary" : "text-muted-foreground/60 hover:text-foreground"
                      }`} />
                    </Tooltip>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {isActive && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                </button>

                {/* Expanded section — amount input, or evidence-only note for Wages record */}
                {isActive && (
                  <div
                    className="px-5 pb-5 pt-4 border-t border-primary/15 bg-blue-50/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEvidenceOnly ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No monetary claim. Attach supporting records in the <span className="font-semibold text-foreground">Supporting Documents</span> tab.
                      </p>
                    ) : (
                      <>
                        <label className={labelCls}>Amount (SBD)</label>
                        <input
                          {...register(formField, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className={inputCls}
                        />
                      </>
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

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
import { AmountInput } from "@/components/ui/AmountInput";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-md border border-primary/30 bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

type CaseType = "unpaid_contribution" | "unpaid_surcharge" | "wages_record";

const CASE_TYPES: {
  value: CaseType;
  label: string;
  description: string;
  field?: "contributionAmount" | "surchargeAmount";
}[] = [
  {
    value: "unpaid_contribution",
    label: "Unpaid contribution",
    description: "Employer has failed to remit mandatory SINPF contributions.",
    field: "contributionAmount",
  },
  {
    value: "unpaid_surcharge",
    label: "Unpaid surcharge",
    description: "Outstanding penalties or surcharges on overdue contributions.",
    field: "surchargeAmount",
  },
  {
    value: "wages_record",
    label: "Wages record",
    description: "Wages records to be produced by the employer. Evidence-only, no monetary claim.",
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
          {CASE_TYPES.map(({ value, label, description, field: formField }) => {
            const isActive = (field.value ?? []).includes(value);
            const isEvidenceOnly = value === "wages_record";

            const toggle = () => {
              const current = field.value ?? [];
              if (isActive) {
                field.onChange(current.filter((t: string) => t !== value));
                if (formField) setValue(formField, null);
                if (isEvidenceOnly) setValue("wagesPeriods", null);
              } else {
                field.onChange([...current, value]);
              }
            };

            return (
              <div
                key={value}
                className={`rounded-md border overflow-hidden transition-colors ${
                  isActive ? "border-primary" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={toggle}
                  className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                    isActive ? "bg-blue-50" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                      {label}
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

                {isActive && (
                  <div
                    className="px-5 pb-5 pt-4 border-t border-primary/15 bg-blue-50/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEvidenceOnly ? (
                      <div>
                        <label className={labelCls}>Wage periods outstanding</label>
                        <input
                          {...register("wagesPeriods")}
                          className={inputCls}
                          placeholder="e.g. Jan–Jun 2026"
                        />
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          No monetary claim — the employer must produce these records.
                        </p>
                      </div>
                    ) : (
                      formField && (
                        <>
                          <label className={labelCls}>Amount (SBD)</label>
                          <AmountInput
                            {...register(formField, { valueAsNumber: true })}
                            placeholder="0.00"
                            className={inputCls}
                          />
                        </>
                      )
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

import { type UseFormRegister } from "react-hook-form";
import { CaseFormValues } from "@/db/validator";

const inputClasses =
  "w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/30";
const labelClasses =
  "block text-sm font-medium text-foreground mb-2 ml-1";

export default function FinancialDetails({
  register,
  grandTotal,
}: {
  register: UseFormRegister<CaseFormValues>;
  grandTotal: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="flex flex-col">
          <label className={labelClasses}>Total contributions</label>
          <input
            {...register("totalContributions", { valueAsNumber: true })}
            type="number"
            className={inputClasses}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div className="flex flex-col">
          <label className={labelClasses}>Total surcharges</label>
          <input
            {...register("totalSurcharges", { valueAsNumber: true })}
            type="number"
            className={inputClasses}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div className="flex flex-col">
          <label className={labelClasses}>Wages record</label>
          <input
            {...register("wagesRecord", { valueAsNumber: true })}
            type="number"
            className={inputClasses}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Grand Total */}
      <div className="relative rounded-md overflow-hidden p-5 bg-sinpf-navy border border-blue-800">
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.06em]">
              Grand total claim
            </p>
            <p className="text-xs text-white/50 mt-0.5">Auto-calculated · SBD</p>
          </div>
          <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {grandTotal.toLocaleString("en-SB", {
              style: "currency",
              currency: "SBD",
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

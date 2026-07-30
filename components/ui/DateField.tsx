"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const triggerCls =
  "w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-medium " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring " +
  "transition-colors flex items-center justify-between gap-2 text-left cursor-pointer";

const dayPickerClassNames = {
  root:            "text-sm text-foreground",
  months:          "relative",
  month:           "space-y-2",
  month_caption:   "flex items-center justify-center h-8 font-semibold text-foreground",
  caption_label:   "text-sm",
  nav:             "absolute top-0 inset-x-0 h-8 flex items-center justify-between px-1",
  button_previous: "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
  button_next:     "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
  month_grid:      "border-collapse",
  weekdays:        "flex",
  weekday:         "w-9 h-8 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide",
  week:            "flex",
  day:             "w-9 h-9 p-0",
  day_button:      "w-full h-full rounded-md text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors tabular-nums",
  outside:         "text-muted-foreground/40",
  disabled:        "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
} as const;

const modifiersClassNames = {
  selected:
    "[&>button]:!bg-primary [&>button]:!text-white [&>button]:!font-semibold " +
    "[&>button:hover]:!bg-blue-600 [&>button:hover]:!text-white",
  today: "[&>button]:font-bold [&>button]:text-primary",
};

export function DateField({
  value,
  onChange,
  placeholder = "Select date…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const display  = selected && isValid(selected) ? format(selected, "d MMM yyyy") : "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerCls}
      >
        <span className={display ? "font-medium text-foreground" : "text-muted-foreground/50"}>
          {display || placeholder}
        </span>
        <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 rounded-md border border-border bg-background shadow-md p-3">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            showOutsideDays
            classNames={dayPickerClassNames}
            modifiersClassNames={modifiersClassNames}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                ),
            }}
          />
        </div>
      )}
    </div>
  );
}

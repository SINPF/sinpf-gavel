"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const wrapperCls =
  "w-full flex items-center rounded-md border border-border bg-background " +
  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring transition-colors";
const inputCls =
  "flex-1 min-w-0 px-4 py-3 bg-transparent text-foreground font-medium " +
  "focus:outline-none placeholder:text-muted-foreground/50";
const triggerBtnCls =
  "px-3 py-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer";

const dayPickerClassNames = {
  root:            "text-sm text-foreground",
  months:          "relative",
  month:           "space-y-2",
  month_caption:   "flex items-center justify-center h-8 font-semibold text-foreground",
  caption_label:   "text-sm",
  dropdowns:       "flex items-center justify-center gap-2 h-8 text-sm font-semibold text-foreground",
  dropdown_root:   "relative",
  dropdown:        "absolute inset-0 opacity-0 cursor-pointer",
  months_dropdown: "text-sm font-semibold text-foreground bg-transparent",
  years_dropdown:  "text-sm font-semibold text-foreground bg-transparent",
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

const INPUT_FORMATS = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd"];

function parseTyped(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const fmt of INPUT_FORMATS) {
    const d = parse(trimmed, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

export function DateField({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => isoToDisplay(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const currentYear = new Date().getFullYear();
  const startMonth = new Date(currentYear - 30, 0);
  const endMonth = new Date(currentYear + 5, 11);

  function commitTyped() {
    if (text.trim() === "") {
      if (value) onChange("");
      return;
    }
    const d = parseTyped(text);
    if (d) {
      onChange(format(d, "yyyy-MM-dd"));
    } else {
      setText(isoToDisplay(value));
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className={wrapperCls}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={commitTyped}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTyped();
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={inputCls}
          inputMode="numeric"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Open calendar"
          className={triggerBtnCls}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 rounded-md border border-border bg-background shadow-md p-3">
          <DayPicker
            mode="single"
            selected={selected && isValid(selected) ? selected : undefined}
            defaultMonth={selected && isValid(selected) ? selected : new Date()}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
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

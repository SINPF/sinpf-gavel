"use client";

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

// Form conventions (DESIGN-SYSTEM.md §5):
//   Labels 14/500 above inputs, helper text 12px muted,
//   error text + border in --destructive, focus ring --ring (brand blue).
const baseInputClasses =
  "w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" +
  " placeholder:text-muted-foreground/60 transition-colors" +
  " focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring";

const errorClasses = "border-destructive focus:border-destructive focus:ring-destructive";
const normalClasses = "border-input";

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ id, label, hint, error, required, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive font-medium">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Text / Number / Date Input ── */
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FormInput({ label, hint, error, className = "", ...props }: FormInputProps) {
  const uid = useId();
  const id = props.id ?? uid;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={props.required}>
      <input
        id={id}
        className={`${baseInputClasses} ${error ? errorClasses : normalClasses} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

/* ── Select ── */
interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FormSelect({
  label, hint, error, options, placeholder, className = "", ...props
}: FormSelectProps) {
  const uid = useId();
  const id = props.id ?? uid;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={props.required}>
      <select
        id={id}
        className={`${baseInputClasses} ${error ? errorClasses : normalClasses} cursor-pointer ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

/* ── Textarea ── */
interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FormTextarea({ label, hint, error, className = "", ...props }: FormTextareaProps) {
  const uid = useId();
  const id = props.id ?? uid;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={props.required}>
      <textarea
        id={id}
        rows={props.rows ?? 4}
        className={`${baseInputClasses} ${error ? errorClasses : normalClasses} resize-y ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

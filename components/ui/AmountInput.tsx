"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

const CONTROL_KEYS = new Set([
  "Backspace", "Delete", "Tab", "Escape", "Enter",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
]);

/**
 * Numeric-only decimal input.
 *
 * `type="text"` (for consistent cross-browser behavior — `type="number"` lets
 * `e`, `E`, `+`, `-` through and some browsers still display letters). Filters
 * keystrokes and paste content to digits + one decimal point.
 * `inputMode="decimal"` gives mobile a numeric keypad.
 */
export const AmountInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function AmountInput({ onKeyDown, onPaste, ...rest }, ref) {
    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        onKeyDown={(e) => {
          if (CONTROL_KEYS.has(e.key) || e.ctrlKey || e.metaKey) {
            onKeyDown?.(e);
            return;
          }
          if (!/^[0-9.]$/.test(e.key)) {
            e.preventDefault();
            return;
          }
          onKeyDown?.(e);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!/^[0-9]*\.?[0-9]*$/.test(text)) {
            e.preventDefault();
            return;
          }
          onPaste?.(e);
        }}
      />
    );
  },
);

"use client";

/**
 * DatePicker — Issue #65 (MatanOga01)
 *
 * Issue #65: Calendar text uses CSS custom properties tied to the active
 * colour scheme so it maintains WCAG AA contrast (≥4.5:1 for normal text)
 * in both light and dark themes. All dark-mode overrides live in CSS rather
 * than hard-coded hex values, making them easy to update from a single
 * design-token source.
 *
 * The component wraps a native <input type="date"> for maximum browser
 * accessibility support and adds an explicit <label> so assistive technology
 * always announces the field purpose.
 */

import { useId } from "react";

export interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Additional class applied to the wrapper. */
  className?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  error,
  className = "",
}: DatePickerProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    /*
     * Issue #65: CSS custom properties fall back gracefully in environments
     * that don't define them. The .date-picker wrapper's background and text
     * colours in globals.css should include a @media (prefers-color-scheme: dark)
     * override so the calendar popup is readable on dark themes.
     *
     * Minimum contrast targets:
     *   --datepicker-text on --datepicker-bg    ≥ 4.5:1 (normal text)
     *   --datepicker-text on --datepicker-hover ≥ 4.5:1 (hover/focus state)
     */
    <div
      className={`date-picker${className ? ` ${className}` : ""}${disabled ? " date-picker--disabled" : ""}`}
      style={
        {
          /* Light-mode defaults; dark-mode overrides belong in globals.css */
          "--datepicker-bg": "var(--brand-surface, #ffffff)",
          "--datepicker-text": "var(--brand-text, #111827)",
          "--datepicker-border": "var(--brand-border, #d1d5db)",
          "--datepicker-hover": "var(--brand-surface-alt, #f3f4f6)",
          "--datepicker-focus-ring": "var(--brand-accent, #6366f1)",
        } as React.CSSProperties
      }
    >
      <label htmlFor={id} className="date-picker__label">
        {label}
        {required && (
          <span aria-hidden="true" className="date-picker__required">
            {" *"}
          </span>
        )}
      </label>

      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`date-picker__input${error ? " date-picker__input--error" : ""}`}
      />

      {error && (
        <p id={errorId} role="alert" className="date-picker__error">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * PasswordInput — Issues #63, #64 (Mai-Fura)
 *
 * A password field with a keyboard-accessible show/hide toggle.
 *
 * Issue #64: The show/hide control now carries an accessible name via
 * aria-label so screen-reader users know what it does.
 */

import { useState, useId } from "react";

export interface PasswordInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Additional class names for the wrapper element. */
  className?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Error message shown below the input. */
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  className = "",
  required = false,
  error,
  autoComplete = "current-password",
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`password-input-wrapper ${className}`.trim()}>
      <label htmlFor={inputId} className="password-input-label">
        {label}
        {required && (
          <span aria-hidden="true" className="password-input-required">
            {" "}*
          </span>
        )}
      </label>

      <div className="password-input-field">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="password-input-control"
        />

        {/* Issue #64: aria-label gives the toggle an accessible name.          *
         *  aria-pressed conveys the current state (password visible or not).   *
         *  Using a <button> (not a <div> or <span>) ensures keyboard focus and *
         *  Enter/Space activation work without extra event handlers.            */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="password-input-toggle"
        >
          {visible ? (
            /* Eye-slash icon — password is currently visible */
            <svg
              aria-hidden="true"
              focusable="false"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Eye icon — password is currently hidden */
            <svg
              aria-hidden="true"
              focusable="false"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="password-input-error">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

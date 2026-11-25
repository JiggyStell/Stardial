"use client";

/**
 * SignupForm — Issues #67, #68 (Mai-Fura)
 *
 * Issue #68: Pressing Enter now triggers form submission with clear visual
 * and accessible feedback — a success message is announced via aria-live
 * so keyboard and screen-reader users know whether registration succeeded.
 *
 * Issue #67: Banner/heading text uses responsive typography (clamp) so it
 * stays readable across all viewport widths without truncation.
 */

import { useState, FormEvent } from "react";

export interface SignupFormProps {
  /** Called with the submitted values. Must reject with an Error on failure. */
  onSubmit: (data: { name: string; email: string; password: string }) => Promise<void>;
  /** Product or brand name shown in the banner heading. */
  productName?: string;
}

export function SignupForm({
  onSubmit,
  productName = "Stardial",
}: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* Issue #68: standard <form> onSubmit fires on Enter and on button click. *
   * aria-live="polite" on the feedback region notifies assistive technology  *
   * of the outcome without disrupting the user's reading flow.               */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      await onSubmit({ name, email, password });
      setFeedback({
        type: "success",
        message: "Account created! Check your inbox for a verification email.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="signup-section">
      {/*
       * Issue #67: fluid font size via clamp() prevents truncation on narrow
       * viewports (e.g. 13-inch laptops at 1024 px) while scaling up for
       * wider screens, with no line-clamp hard cut-off.
       */}
      <h1
        className="signup-heading"
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          lineHeight: 1.2,
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        Join {productName}
      </h1>
      <p
        className="signup-subheading"
        style={{
          fontSize: "clamp(0.9rem, 2vw, 1.125rem)",
          overflowWrap: "break-word",
        }}
      >
        Start distributing royalties fairly on the Stellar network.
      </p>

      {/* Issue #68: feedback region is always rendered so the aria-live     *
       * region is registered before any announcement is made.               */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`signup-feedback${feedback ? ` signup-feedback--${feedback.type}` : ""}`}
      >
        {feedback && (
          <>
            <span aria-hidden="true">
              {feedback.type === "success" ? "✓ " : "⚠ "}
            </span>
            {feedback.message}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="signup-form">
        <div className="signup-field">
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
            autoComplete="name"
            className="signup-input"
          />
        </div>

        <div className="signup-field">
          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            autoComplete="email"
            className="signup-input"
          />
        </div>

        <div className="signup-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            autoComplete="new-password"
            className="signup-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="signup-submit"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </section>
  );
}

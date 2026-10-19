"use client";

import type { ReactNode } from "react";

/**
 * Issue #837: a focused, accessible empty-state surface for the projects
 * dashboard. Consolidates four distinct UI needs behind one component so the
 * dashboard has a single, testable, recoverable landing page:
 *
 *   - **No projects yet.** New users with no wallet and no projects.
 *   - **Disconnected wallet.** Returning visitors whose session has lapsed.
 *   - **Loading failure.** RPC or backend that failed to load the list.
 *   - **Retry success.** Verified via the dashboard tests after a refresh
 *     action. The `onRetry` callback is also used for the loading-failure
 *     variant so the user can recover from a transient error in place.
 *
 * Design contract (called out by the issue acceptance criteria):
 *   - Primary actions must be present and accessible. We always emit at
 *     least one named button so screen-reader users have a clear next step.
 *   - Avoid instructional clutter beyond necessary labels. No emoji
 *     decorations, no multi-paragraph onboarding copy.
 *   - Match the dashboard's existing `glass-card` framing and `font-display`
 *     sibling headings used in `ProjectsList.tsx`.
 */
export type EmptyStateVariant =
  | "no-projects"
  | "wallet-disconnected"
  | "loading-failure";

export interface EmptyStateProps {
  /** Discriminated by the dashboard loader. */
  variant: EmptyStateVariant;
  /**
   * Short, single-line headline describing the situation. Optional because
   * each variant has a sensible default title baked into COPY; callers only
   * override when they need custom copy that the variant doesn't anticipate.
   */
  title?: string;
  /**
   * Body copy. Keep to a single sentence. Empty strings render nothing.
   * Length is intentionally bounded; if you need more, those belong in
   * a separate onboarding surface, not the empty state.
   */
  description?: string;
  /**
   * Primary action label, e.g. "Refresh Projects" or "Connect Wallet".
   * When omitted, no primary button is rendered and the empty state is
   * informational only.
   */
  primaryActionLabel?: string;
  /** Handler for the primary action. Omit together with `primaryActionLabel`. */
  onPrimaryAction?: () => void;
  /**
   * Optional retry caption shown for the loading-failure variant. Renders
   * a quieter secondary action below the primary so screen-reader users
   * can tab to it after the primary.
   */
  retryLabel?: string;
  onRetry?: () => void;
  /**
   * Slot for any additional content (e.g. a tag badge, a status pill).
   * Rendered as children; semantically a footer block.
   */
  children?: ReactNode;
}

const COPY: Record<EmptyStateVariant, { defaultTitle: string; defaultDescription: string }> = {
  "no-projects": {
    defaultTitle: "No projects found",
    defaultDescription: "Click Refresh Projects to load available splits.",
  },
  "wallet-disconnected": {
    defaultTitle: "Connect your wallet to view projects",
    defaultDescription: "Stardial reads your project list from your connected Stellar account.",
  },
  "loading-failure": {
    defaultTitle: "Could not load projects",
    defaultDescription: "There was a problem fetching the projects list. Try again in a moment.",
  },
};

export function EmptyState({
  variant,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  retryLabel,
  onRetry,
  children,
}: EmptyStateProps) {
  const fallback = COPY[variant];
  const resolvedTitle = title || fallback.defaultTitle;
  const resolvedDescription = description ?? fallback.defaultDescription;
  const showPrimary = Boolean(primaryActionLabel && onPrimaryAction);
  const showRetry = Boolean(retryLabel && onRetry);

  return (
    <div
      role={variant === "loading-failure" ? "alert" : "status"}
      aria-live={variant === "loading-failure" ? "assertive" : "polite"}
      className="glass-card rounded-[2.5rem] p-12 text-center"
      data-testid="empty-state"
      data-variant={variant}
    >
      <p
        className="font-display text-2xl tracking-tight mb-2"
        data-testid="empty-state-title"
      >
        {resolvedTitle}
      </p>
      <p
        className="text-muted text-sm font-medium max-w-md mx-auto"
        data-testid="empty-state-description"
      >
        {resolvedDescription}
      </p>

      {showPrimary && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="premium-button inline-flex items-center gap-2 rounded-2xl bg-greenMid px-8 py-4 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-20"
            data-testid="empty-state-primary"
          >
            {primaryActionLabel}
          </button>
        </div>
      )}

      {showRetry && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors disabled:opacity-50"
            data-testid="empty-state-retry"
          >
            {retryLabel}
          </button>
        </div>
      )}

      {children && (
        <div
          className="mt-6 text-[10px] font-bold uppercase tracking-widest text-muted"
          data-testid="empty-state-footer"
        >
          {children}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * HiddenContentAudit — Issue #69 (MatanOga01)
 *
 * This module documents and exports the accessibility patterns that resolve
 * issue #69 (hidden text announced by screen readers) and provides a
 * reusable VisuallyHidden utility component.
 *
 * Problem: Visually-hidden content — text clipped off-screen via
 * `.sr-only` / `position: absolute; clip: rect(0 0 0 0)` — is correctly
 * announced by screen readers because it remains in the accessibility tree.
 * However, elements that should be visually AND aurally hidden (decorative
 * text, duplicate labels, aria-hidden candidates) must use `aria-hidden="true"`
 * or `display: none` / `visibility: hidden` to suppress the announcement.
 *
 * Fix approach:
 *  1. Decorative or duplicate content: add `aria-hidden="true"`.
 *  2. Content that must be in the DOM for sighted users but hidden from AT:
 *     add `aria-hidden="true"` (e.g. icon-only SVGs already handled with this).
 *  3. Content that must be announced but not seen: use <VisuallyHidden>.
 *  4. Content that must be neither seen nor announced: use `display: none`.
 *
 * This component demonstrates pattern 3 (announce only) and exports a
 * helper so the codebase has a single consistent implementation.
 */

import { ReactNode } from "react";

export interface VisuallyHiddenProps {
  /**
   * Content that should be announced by screen readers but is not visible.
   * Use this for supplementary context (e.g. "opens in new tab") or for
   * skip-navigation links.
   */
  children: ReactNode;
  /** Render as a different HTML element (default: "span"). */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Renders content that is audible to screen readers but invisible to sighted
 * users. Uses the standard CSS visually-hidden technique (position + clip) so
 * the element remains in the accessibility tree and document flow.
 *
 * Do NOT use this for content that should also be hidden from AT — use
 * aria-hidden="true" or display:none for that.
 */
export function VisuallyHidden({
  children,
  as: Tag = "span",
}: VisuallyHiddenProps) {
  return (
    <Tag
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Example of correctly hidden decorative text.
 *
 * This component wraps content that must be in the DOM (e.g. for animation
 * or CSS targeting) but should NOT be announced by screen readers. It applies
 * aria-hidden so AT skips the element entirely.
 *
 * Issue #69: Use this pattern anywhere text or icons are repeated or decorative
 * (e.g. icon labels whose meaning is already conveyed by surrounding text).
 */
export function AriaHidden({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}) {
  return <Tag aria-hidden="true">{children}</Tag>;
}

"use client";

/**
 * FAQAccordion — Issues #65, #66 (MatanOga01)
 *
 * Issue #66: FAQ items use <button> semantics so they receive keyboard focus
 * and respond to Enter/Space without custom key-event handlers. aria-expanded
 * communicates whether each answer is open or closed.
 *
 * Issue #65: The component applies dark-mode-aware CSS custom properties for
 * text and background so calendar / date-related UI (and all other UI) remains
 * readable against dark backgrounds. Date-picker integration notes are in the
 * DatePicker component; this accordion demonstrates the same token approach.
 */

import { useState } from "react";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  /** Heading text above the accordion. */
  heading?: string;
  /** Allow multiple items open simultaneously (defaults to single-open). */
  multi?: boolean;
}

export function FAQAccordion({
  items,
  heading = "Frequently Asked Questions",
  multi = false,
}: FAQAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  /* Issue #66: toggle fires on click AND on keyboard Enter/Space because   *
   * the trigger is a <button>. No extra keydown handler is required.       */
  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multi) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    /*
     * Issue #65: CSS custom properties (--faq-bg, --faq-text, --faq-border,
     * --faq-answer-bg) are set here via inline style as sensible defaults.
     * They should be overridden in globals.css inside a @media (prefers-color-scheme: dark)
     * block (and in any .dark class selector) to guarantee readable contrast in dark mode.
     */
    <section
      className="faq-accordion"
      style={
        {
          "--faq-bg": "var(--brand-surface, #fff)",
          "--faq-text": "var(--brand-text, #111)",
          "--faq-border": "var(--brand-border, #e5e7eb)",
          "--faq-answer-bg": "var(--brand-surface-alt, #f9fafb)",
          "--faq-answer-text": "var(--brand-muted, #374151)",
        } as React.CSSProperties
      }
    >
      {heading && <h2 className="faq-accordion__heading">{heading}</h2>}

      <dl className="faq-accordion__list">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          const panelId = `faq-panel-${item.id}`;
          const triggerId = `faq-trigger-${item.id}`;

          return (
            <div key={item.id} className="faq-accordion__item">
              <dt className="faq-accordion__question">
                {/* Issue #66: <button> gives focus, Enter, and Space for free */}
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                  className="faq-accordion__trigger"
                >
                  <span className="faq-accordion__trigger-text">
                    {item.question}
                  </span>
                  {/* Visual indicator that is hidden from AT */}
                  <span
                    aria-hidden="true"
                    className={`faq-accordion__chevron${isOpen ? " faq-accordion__chevron--open" : ""}`}
                  >
                    ▾
                  </span>
                </button>
              </dt>

              <dd
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                className="faq-accordion__answer"
              >
                <p>{item.answer}</p>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

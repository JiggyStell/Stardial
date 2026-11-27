"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  captureCurrentRoute,
  homeHrefForPath,
  isSafeInternalPath,
  type RouteContext
} from "@/lib/route-context";

/** Issue #60 — 404 recovery navigation links.
 *
 *  Provides multiple escape routes so users never feel stuck:
 *  - Go back (browser history or safe internal link)
 *  - Back to home
 *  - Quick-nav links to key sections of the app
 */

const NAV_LINKS = [
  { label: "Dashboard", href: "/en" },
  { label: "Create a Split", href: "/en#create" },
  { label: "Manage & Distribute", href: "/en#manage" },
  { label: "Projects", href: "/en#projects" },
] as const;

export function NotFoundRecovery() {
  const router = useRouter();
  const [context, setContext] = useState<RouteContext | null>(null);

  useEffect(() => {
    setContext(captureCurrentRoute());
  }, []);

  const previousPath = context?.previousPath;
  const secondaryClass =
    "inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-[var(--brand-text)] transition-colors hover:border-white/40 hover:text-white";

  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      {/* Primary actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isSafeInternalPath(previousPath) ? (
          <Link href={previousPath} className={secondaryClass}>
            Go back
          </Link>
        ) : (
          <button type="button" onClick={() => router.back()} className={secondaryClass}>
            Go back
          </button>
        )}
        <Link
          href={homeHrefForPath(context?.path ?? null)}
          className="premium-button inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-6 py-3 font-semibold text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Secondary — quick links to key app sections */}
      <nav aria-label="Site sections" className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-[var(--brand-muted)]">
          Or jump to a section
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-[var(--brand-muted)] transition-colors hover:border-white/30 hover:text-[var(--brand-text)]"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Debug route info */}
      {context ? (
        <p className="text-sm text-[var(--brand-muted)]" data-testid="not-found-route">
          You were on: <code className="font-mono">{context.path}</code>
        </p>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";

import { NotFoundRecovery } from "@/components/not-found-recovery";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist or has been moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      {/* Large decorative 404 */}
      <p className="font-display text-[clamp(6rem,20vw,12rem)] leading-none font-bold tracking-tighter text-transparent"
         style={{ WebkitTextStroke: "2px var(--brand-accent)" }}>
        404
      </p>

      {/* Heading */}
      <h1 className="mt-4 font-display text-3xl font-bold text-[var(--brand-text)]">
        Page not found
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-sm text-[var(--brand-muted)] leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or head back to the homepage.
      </p>

      {/* CTA */}
      <NotFoundRecovery />

      {/* Subtle bottom-accent line */}
      <div className="mt-16 h-px w-24 bg-[var(--brand-accent)] opacity-40" />
    </main>
  );
}

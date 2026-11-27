"client";

/**
 * TestimonialsSection — Issue #58
 *
 * Renders quote cards in a responsive grid with consistent spacing tokens.
 * Cards align uniformly across all screen sizes using standardised gap and
 * padding values derived from the design-token layer (tokens.css).
 */

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Stardial made splitting royalties with my co-writers completely transparent. No spreadsheets, no disputes — it just works.",
    author: "Amara O.",
    role: "Recording Artist",
  },
  {
    quote:
      "As a label manager I deal with dozens of collaborators per release. Stardial saves us hours every distribution cycle.",
    author: "Kwame D.",
    role: "Label Manager",
  },
  {
    quote:
      "The on-chain receipts are a game-changer for my accountant. Every payout is permanently verifiable.",
    author: "Siosaia T.",
    role: "Independent Producer",
  },
];

export function TestimonialsSection() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="w-full py-12 md:py-16"
    >
      <h2
        id="testimonials-heading"
        className="mb-2 text-center font-display text-2xl font-bold tracking-tight text-[var(--brand-text)]"
      >
        What creators are saying
      </h2>
      <p className="mb-10 text-center text-sm leading-relaxed text-[var(--brand-muted)]">
        Real royalty splits. Real results.
      </p>

      {/* Responsive grid: 1 col → 2 col → 3 col.
          gap-6 on mobile, gap-8 on md+ keeps breathing room consistent. */}
      <ul
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3"
      >
        {TESTIMONIALS.map((item) => (
          <li key={item.author}>
            <figure className="glass-card flex h-full flex-col rounded-[2rem] p-6 md:p-8">
              {/* Quote mark */}
              <span
                aria-hidden="true"
                className="mb-4 font-display text-4xl leading-none text-[var(--brand-accent)] opacity-60"
              >
                &ldquo;
              </span>

              {/* Quote body — flex-1 pushes attribution to the bottom */}
              <blockquote className="flex-1">
                <p className="text-sm leading-relaxed text-[var(--brand-text)]">
                  {item.quote}
                </p>
              </blockquote>

              {/* Attribution */}
              <figcaption className="mt-6 border-t border-white/5 pt-5">
                <p className="text-sm font-semibold text-[var(--brand-text)]">
                  {item.author}
                </p>
                <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                  {item.role}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

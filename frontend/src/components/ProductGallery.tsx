"use client";

/**
 * ProductGallery — Issue #63 (Mai-Fura)
 *
 * An accessible image gallery that supports both mouse/touch and full
 * keyboard navigation.
 *
 * Issue #63: Gallery controls respond to focus, Enter, Space, ArrowLeft,
 * and ArrowRight so keyboard-only users can inspect every image.
 * ARIA roles and labels communicate the current state to screen readers.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProductGalleryProps {
  images: GalleryImage[];
  /** Accessible label for the gallery region, e.g. the product name. */
  ariaLabel?: string;
}

export function ProductGallery({
  images,
  ariaLabel = "Product gallery",
}: ProductGalleryProps) {
  const [current, setCurrent] = useState(0);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const total = images.length;

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  /* Issue #63: Arrow-key navigation while focus is inside the gallery. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [prev, next]
  );

  /* Keep thumbnail focus in sync with the active slide. */
  useEffect(() => {
    thumbnailRefs.current[current]?.focus({ preventScroll: true });
  }, [current]);

  if (total === 0) return null;

  const active = images[current];

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
    <section
      aria-label={ariaLabel}
      className="product-gallery"
      onKeyDown={handleKeyDown}
    >
      {/* Main image */}
      <div
        className="product-gallery__main"
        aria-live="polite"
        aria-atomic="true"
      >
        <Image
          key={current}
          src={active.src}
          alt={active.alt}
          fill
          className="product-gallery__image"
          sizes="(max-width: 768px) 100vw, 60vw"
          priority={current === 0}
        />

        {/* Previous / Next controls */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="product-gallery__nav product-gallery__nav--prev"
        >
          {/* Left chevron */}
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="product-gallery__nav product-gallery__nav--next"
        >
          {/* Right chevron */}
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Caption */}
      {active.caption && (
        <p className="product-gallery__caption" aria-live="polite">
          {active.caption}
        </p>
      )}

      {/* Thumbnail strip / dot indicators */}
      {total > 1 && (
        <div
          role="tablist"
          aria-label="Gallery thumbnails"
          className="product-gallery__thumbnails"
        >
          {images.map((img, i) => (
            <button
              key={i}
              ref={(el) => { thumbnailRefs.current[i] = el; }}
              role="tab"
              type="button"
              aria-selected={i === current}
              aria-label={`Image ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
              onClick={() => setCurrent(i)}
              className={`product-gallery__dot${i === current ? " product-gallery__dot--active" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Screen-reader position announcement */}
      <p className="sr-only" aria-live="polite">
        Image {current + 1} of {total}
      </p>
    </section>
  );
}

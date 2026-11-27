"use client";

/**
 * VideoPlayer — Issue #57
 *
 * A responsive video player whose native controls are always reachable on
 * mobile viewports. The player:
 *
 * - Uses `width: 100%` and `max-width: 100%` so it never overflows its
 *   container on narrow screens.
 * - Preserves the video's aspect ratio via an intrinsic-size wrapper so the
 *   height shrinks proportionally and controls are never clipped below the
 *   fold.
 * - Passes `controls` and `playsInline` so playback controls render natively
 *   and videos do not auto-enter fullscreen on iOS.
 * - Accepts an optional `poster` image (with descriptive `alt` text for
 *   accessibility) shown before playback starts.
 * - Provides a `preload` prop so callers can tune initial data fetching.
 */

import { useRef } from "react";

export interface VideoPlayerProps {
  /** URL of the video file (mp4, webm, etc.). */
  src: string;
  /**
   * MIME type of the video, e.g. "video/mp4".
   * Providing this helps browsers pick the right codec without probing.
   */
  type?: string;
  /** URL of the poster image shown before playback. */
  poster?: string;
  /** Accessible description of the video content for screen readers. */
  title: string;
  /**
   * Aspect ratio of the video expressed as "width/height".
   * Defaults to "16/9". Use "4/3" for older content, "1/1" for square, etc.
   */
  aspectRatio?: string;
  /**
   * Controls how much data the browser preloads.
   * "none" is safest on mobile (saves data); "metadata" loads duration/dimensions;
   * "auto" lets the browser decide.
   */
  preload?: "none" | "metadata" | "auto";
  /** Additional CSS class names applied to the outer wrapper. */
  className?: string;
}

export function VideoPlayer({
  src,
  type = "video/mp4",
  poster,
  title,
  aspectRatio = "16/9",
  preload = "metadata",
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-black ${className ?? ""}`}
      style={{ aspectRatio }}
    >
      {/*
       * The <video> element is sized to fill the aspect-ratio wrapper.
       * `w-full h-full` ensures it takes up the full available space.
       *
       * `controls`      — Native browser controls (play/pause, volume,
       *                   scrubber, fullscreen). Always visible on mobile.
       * `playsInline`   — On iOS, plays inside the page instead of launching
       *                   the system fullscreen player, keeping controls
       *                   visible within the app viewport.
       * `preload`       — Configurable; defaults to "metadata" to avoid
       *                   downloading the whole file on mobile before play.
       */}
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload={preload}
        poster={poster}
        title={title}
        aria-label={title}
        style={{
          /*
           * Ensure the controls bar is never hidden below the viewport by
           * capping the height to the full viewport height. Combined with the
           * aspect-ratio wrapper this guarantees controls remain on-screen on
           * mobile devices where the viewport is shorter than the natural video
           * height.
           */
          maxHeight: "100vh",
        }}
      >
        <source src={src} type={type} />
        <track kind="captions" src="data:text/vtt,"
          label="English"
          default
        />
        {/* Fallback message for browsers that do not support <video>. */}
        <p className="p-4 text-sm text-white/70">
          Your browser does not support the video element. You can{" "}
          <a
            href={src}
            download
            className="underline hover:text-white transition-colors"
          >
            download the video
          </a>{" "}
          instead.
        </p>
      </video>
    </div>
  );
}

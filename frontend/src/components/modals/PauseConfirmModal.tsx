"use client";

export interface PauseConfirmModalProps {
  isOpen: boolean;
  action: "pause" | "unpause";
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PauseConfirmModal({
  isOpen,
  action,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: PauseConfirmModalProps) {
  if (!isOpen) return null;

  const isPause = action === "pause";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-confirm-title"
        className="glass-card w-full max-w-md rounded-3xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="pause-confirm-title"
          className="font-display text-xl tracking-tight"
        >
          {isPause ? "Confirm Pause" : "Confirm Resume"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {isPause
            ? "Pausing distributions rejects all payout calls until distributions are resumed."
            : "Resuming distributions re-enables payout calls for all active projects."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="premium-button rounded-2xl bg-greenBright px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#0a0a09] disabled:opacity-40"
          >
            {isSubmitting
              ? "Submitting…"
              : isPause
                ? "Confirm Pause"
                : "Confirm Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}

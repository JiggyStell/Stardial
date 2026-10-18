"use client";

export interface DistributeConfirmModalProps {
  isOpen: boolean;
  round?: number | string;
  amount?: string;
  recipientCount?: number;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DistributeConfirmModal({
  isOpen,
  round,
  amount,
  recipientCount,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: DistributeConfirmModalProps) {
  if (!isOpen) return null;

  const details = [
    round != null ? `round ${round}` : null,
    amount ? `${amount} stroops` : null,
    recipientCount != null ? `${recipientCount} recipients` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribute-confirm-title"
        className="glass-card w-full max-w-md rounded-3xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="distribute-confirm-title"
          className="font-display text-xl tracking-tight"
        >
          Confirm Distribution
        </h2>
        <p className="mt-2 text-sm text-muted">
          This will execute a payout{details ? ` for ${details}` : ""}. This
          action cannot be undone.
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
            {isSubmitting ? "Submitting…" : "Confirm Distribute"}
          </button>
        </div>
      </div>
    </div>
  );
}

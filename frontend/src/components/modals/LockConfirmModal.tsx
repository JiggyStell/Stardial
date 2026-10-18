"use client";

export interface LockConfirmModalProps {
  isOpen: boolean;
  projectId?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LockConfirmModal({
  isOpen,
  projectId,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: LockConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-confirm-title"
        className="glass-card w-full max-w-md rounded-3xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="lock-confirm-title"
          className="font-display text-xl tracking-tight"
        >
          Lock Project
        </h2>
        <p className="mt-2 text-sm text-muted">
          Locking{projectId ? ` project ${projectId}` : " this project"} makes
          its configuration immutable. This cannot be undone.
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
            {isSubmitting ? "Locking…" : "Confirm Lock"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export interface DepositModalProps {
  isOpen: boolean;
  projectId?: string;
  isSubmitting?: boolean;
  onConfirm: (amount: string) => void;
  onCancel: () => void;
}

export function DepositModal({
  isOpen,
  projectId,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: DepositModalProps) {
  const [amount, setAmount] = useState("");

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
        aria-labelledby="deposit-title"
        className="glass-card w-full max-w-md rounded-3xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deposit-title" className="font-display text-xl tracking-tight">
          Confirm Deposit
        </h2>
        <p className="mt-2 text-sm text-muted">
          {projectId
            ? `Deposit funds into project ${projectId}.`
            : "Deposit funds into this project."}
        </p>
        <label
          htmlFor="deposit-amount"
          className="mt-6 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
        >
          Amount (stroops)
        </label>
        <input
          id="deposit-amount"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          disabled={isSubmitting}
          className="glass-input mt-2 w-full rounded-2xl px-5 py-4 text-sm"
        />
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
            onClick={() => onConfirm(amount)}
            disabled={isSubmitting || !amount.trim()}
            className="premium-button rounded-2xl bg-greenBright px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#0a0a09] disabled:opacity-40"
          >
            {isSubmitting ? "Submitting…" : "Confirm Deposit"}
          </button>
        </div>
      </div>
    </div>
  );
}

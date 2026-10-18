"use client";

import { useEffect, useState } from "react";

export interface MetadataEditModalProps {
  isOpen: boolean;
  projectId?: string;
  initialTitle?: string;
  initialDescription?: string;
  isSubmitting?: boolean;
  onSave: (values: { title: string; description: string }) => void;
  onCancel: () => void;
}

export function MetadataEditModal({
  isOpen,
  projectId,
  initialTitle = "",
  initialDescription = "",
  isSubmitting = false,
  onSave,
  onCancel,
}: MetadataEditModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
    }
  }, [isOpen, initialTitle, initialDescription]);

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
        aria-labelledby="metadata-edit-title"
        className="glass-card w-full max-w-md rounded-3xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="metadata-edit-title"
          className="font-display text-xl tracking-tight"
        >
          Edit Metadata
        </h2>
        {projectId && (
          <p className="mt-1 font-mono text-[10px] text-muted">{projectId}</p>
        )}
        <label
          htmlFor="metadata-title"
          className="mt-6 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
        >
          Display Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSubmitting}
          className="glass-input mt-2 w-full rounded-2xl px-5 py-4 text-sm"
        />
        <label
          htmlFor="metadata-description"
          className="mt-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
        >
          Description
        </label>
        <textarea
          id="metadata-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSubmitting}
          rows={3}
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
            onClick={() => onSave({ title, description })}
            disabled={isSubmitting || !title.trim()}
            className="premium-button rounded-2xl bg-greenBright px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#0a0a09] disabled:opacity-40"
          >
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import { useEffect, useLayoutEffect, useRef } from "react";
import "./Modal.css";
import { useFocusTrap } from "./useFocusTrap";

// Global modal stack to track all currently open dialogs
const modalStack: string[] = [];
let nextModalId = 0;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlayClick = true,
}: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const idRef = useRef<string>("");

  if (!idRef.current) {
    idRef.current = `modal-${++nextModalId}`;
  }
  const modalId = idRef.current;

  // Track in modalStack
  useEffect(() => {
    if (!isOpen) return;

    modalStack.push(modalId);

    return () => {
      const idx = modalStack.indexOf(modalId);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
    };
  }, [isOpen, modalId]);

  // Save & restore focus before the trap moves focus into the dialog.
  useLayoutEffect(() => {
    if (isOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      return;
    }

    lastFocusedElement.current?.focus();
  }, [isOpen]);

  const stackIndex = modalStack.indexOf(modalId);
  const isTopModal = stackIndex !== -1 && stackIndex === modalStack.length - 1;

  // Only run focus trap on the top-most modal
  useFocusTrap(modalRef, isOpen && isTopModal);

  // Escape key handler: close-first behavior (only close the top modal)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalStack[modalStack.length - 1] === modalId) {
          e.stopPropagation();
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, modalId]);

  if (!isOpen) return null;

  // Stacking z-index: base 50 + stack position * 10
  const zIndex = 50 + (stackIndex !== -1 ? stackIndex * 10 : 0);

  return (
    <div
      className="modal-overlay"
      style={{ zIndex }}
      onClick={closeOnOverlayClick && isTopModal ? onClose : undefined}
      onKeyDown={closeOnOverlayClick && isTopModal ? (e) => e.key === "Enter" && onClose() : undefined}
      role="button"
      tabIndex={0}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
        tabIndex={-1}
      >
        {title && <h2 id="modal-title">{title}</h2>}

        <div className="modal-body">{children}</div>

        <button className="modal-close" onClick={onClose} tabIndex={-1}>
          Close
        </button>
      </div>
    </div>
  );
}

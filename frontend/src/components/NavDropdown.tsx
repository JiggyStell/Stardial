"client";

/**
 * NavDropdown — Issue #52
 *
 * A navigation dropdown that does NOT close the moment the cursor leaves the
 * trigger. A configurable close-delay (default 200 ms) gives users time to
 * move their pointer from the trigger button into the submenu panel before the
 * menu disappears.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { clsx } from "clsx";

export interface NavDropdownItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  closeDelayMs?: number;
  className?: string;
}

export function NavDropdown({
  label,
  items,
  closeDelayMs = 200,
  className,
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelayMs);
  }, [cancelClose, closeDelayMs]);

  const open = useCallback(() => {
    cancelClose();
    setIsOpen(true);
  }, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={clsx(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-white/5",
          isOpen && "text-[var(--brand-text)] bg-white/5",
          className,
        )}
      >
        {label}
        <svg
          aria-hidden="true"
          className={clsx(
            "h-4 w-4 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={label}
          tabIndex={-1}
          className={clsx(
            "absolute left-0 top-full z-50 mt-1 min-w-[180px]",
            "rounded-xl border border-white/10 bg-[var(--brand-card)] shadow-xl",
            "py-1",
            "animate-in fade-in slide-in-from-top-1 duration-150",
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              role="menuitem"
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm",
                "text-[var(--brand-muted)] hover:text-[var(--brand-text)] hover:bg-white/5",
                "transition-colors",
              )}
            >
              {item.icon && (
                <span aria-hidden="true" className="shrink-0">
                  {item.icon}
                </span>
              )}
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

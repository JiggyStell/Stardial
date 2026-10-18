"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export interface WalletButtonProps {
  address: string | null;
  network?: string | null;
  isConnecting?: boolean;
  onConnect?: () => void;
  onSwitch?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function WalletAvatar({ address }: { address: string }) {
  const hue = [...address].reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  ) % 360;

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: `hsl(${hue} 70% 45%)` }}
    >
      {address.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function WalletButton({
  address,
  network,
  isConnecting = false,
  onConnect,
  onSwitch,
  onDisconnect,
  className,
}: WalletButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!address) {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={isConnecting}
        aria-busy={isConnecting}
        className={clsx(
          "premium-button inline-flex items-center gap-2 rounded-2xl bg-greenMid px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-white disabled:opacity-40",
          className,
        )}
        data-testid="wallet-button-connect"
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet ${shortAddress(address)}`}
        className="premium-button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-white/10 md:px-4"
        data-testid="wallet-button"
      >
        <WalletAvatar address={address} />
        <span
          className="hidden font-mono normal-case tracking-normal md:inline"
          data-testid="wallet-button-address"
        >
          {shortAddress(address)}
        </span>
        <span
          className="rounded-full bg-greenBright/10 px-2 py-0.5 font-mono text-[9px] text-greenBright md:hidden"
          data-testid="wallet-button-chip"
        >
          {shortAddress(address)}
        </span>
        {network && (
          <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted lg:inline">
            {network}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Wallet actions"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0f0f0e] p-4 shadow-2xl"
          data-testid="wallet-dropdown"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Connected Wallet
          </p>
          <p className="mt-2 break-all font-mono text-xs text-ink">{address}</p>
          {network && (
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted">
              Network: <span className="text-greenBright">{network}</span>
            </p>
          )}
          <div className="mt-4 space-y-2">
            {onSwitch && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSwitch();
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-white/10"
                data-testid="wallet-switch"
              >
                Switch Wallet
              </button>
            )}
            {onDisconnect && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDisconnect();
                }}
                className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/20"
                data-testid="wallet-disconnect"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

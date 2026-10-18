"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SplitModalId =
  | "distribute"
  | "lock"
  | "deposit"
  | "pause"
  | "metadata"
  | null;

interface SplitAppContextValue {
  activeModal: SplitModalId;
  openModal: (id: Exclude<SplitModalId, null>) => void;
  closeModal: () => void;
}

const SplitAppContext = createContext<SplitAppContextValue | null>(null);

export function SplitAppProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<SplitModalId>(null);

  const openModal = useCallback(
    (id: Exclude<SplitModalId, null>) => setActiveModal(id),
    [],
  );
  const closeModal = useCallback(() => setActiveModal(null), []);

  const value = useMemo(
    () => ({ activeModal, openModal, closeModal }),
    [activeModal, openModal, closeModal],
  );

  return (
    <SplitAppContext.Provider value={value}>
      {children}
    </SplitAppContext.Provider>
  );
}

export function useSplitApp() {
  const ctx = useContext(SplitAppContext);
  if (!ctx) {
    throw new Error("useSplitApp must be used within a SplitAppProvider");
  }
  return ctx;
}

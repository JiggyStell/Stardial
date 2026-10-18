"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppShellTab = "dashboard" | "create" | "manage" | "projects";

interface AppShellContextValue {
  activeTab: AppShellTab;
  setActiveTab: (tab: AppShellTab) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AppShellTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((collapsed) => !collapsed),
    [],
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      sidebarCollapsed,
      toggleSidebar,
      isMobileDrawerOpen,
      setMobileDrawerOpen,
    }),
    [activeTab, sidebarCollapsed, toggleSidebar, isMobileDrawerOpen],
  );

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return ctx;
}

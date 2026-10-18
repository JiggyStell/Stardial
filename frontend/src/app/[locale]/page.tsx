"use client";

import { SplitApp } from "@/components/split-app";
import { PageTransition } from "@/components/page-transition";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppShellProvider } from "@/context/AppShellContext";

export default function Home() {
  return (
    <AppShellProvider>
      <DashboardLayout>
        <PageTransition motionKey="home">
          <SplitApp />
        </PageTransition>
      </DashboardLayout>
    </AppShellProvider>
  );
}

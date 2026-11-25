import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RouteContextTracker } from "@/components/route-context-tracker";
import { QueryProvider } from "@/components/query-provider";
import { LoadingBar } from "@/components/LoadingBar";
import { CookieBanner } from "@/components/CookieBanner";
import { defaultMetadata } from "@/lib/metadata";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${dmSans.variable} ${syne.variable} antialiased`}>
        <LoadingBar />
        <RouteContextTracker />
        <AppErrorBoundary>
          <QueryProvider>
            <ToastProvider>
              <WalletProvider>{children}</WalletProvider>
            </ToastProvider>
          </QueryProvider>
        </AppErrorBoundary>
        <CookieBanner />
      </body>
    </html>
  );
}

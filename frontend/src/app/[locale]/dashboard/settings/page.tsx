import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SettingsView } from "@/components/settings/SettingsView";
import { createPageMetadata, isSupportedLocale } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) return {};

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Metadata.settings" });

  return createPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: "/dashboard/settings",
  });
}

export default function SettingsPage() {
  return (
    <div className="p-6 [&_input:-webkit-autofill]:[-webkit-text-fill-color:inherit] [&_input:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&_input:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_var(--background)] [&_input:-webkit-autofill:focus]:[box-shadow:inset_0_0_0_1000px_var(--background),0_0_0_2px_var(--ring)] [&_input]:caret-current [&_input]:text-inherit">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <SettingsView />
    </div>
  );
}

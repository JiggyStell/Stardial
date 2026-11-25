import type { Metadata } from "next";

import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/lib/env";

const SITE_NAME = "Stardial";
const DEFAULT_DESCRIPTION = "Royalty splitting for creative collaborators on Stellar.";
const OG_IMAGE = "/logo.svg";

const ogLocales: Record<string, string> = {
  en: "en_US",
  fr: "fr_FR",
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.svg",
  },
};

type PageMetadataOptions = {
  locale: string;
  title: string;
  description: string;
  pathname?: string;
  indexable?: boolean;
};

type AppLocale = (typeof routing.locales)[number];

export function isSupportedLocale(locale: string): locale is AppLocale {
  return hasLocale(routing.locales, locale);
}

function localizedPath(locale: string, pathname: string) {
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function createPageMetadata({
  locale,
  title,
  description,
  pathname = "/",
  indexable = true,
}: PageMetadataOptions): Metadata {
  const canonical = localizedPath(locale, pathname);
  const languages = Object.fromEntries(
    routing.locales.map((supportedLocale) => [
      supportedLocale,
      localizedPath(supportedLocale, pathname),
    ]),
  );
  const resolvedTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;

  return {
    metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
    title: { absolute: resolvedTitle },
    description,
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": localizedPath(routing.defaultLocale, pathname),
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocales[locale] ?? locale,
      title: resolvedTitle,
      description,
      url: canonical,
      images: [{ url: OG_IMAGE, alt: resolvedTitle }],
    },
    twitter: {
      card: "summary",
      title: resolvedTitle,
      description,
      images: [OG_IMAGE],
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

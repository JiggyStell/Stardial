import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReceiptUnavailable } from "@/components/ReceiptUnavailable";
import { createPageMetadata, isSupportedLocale } from "@/lib/metadata";
import { PrintReceiptButton } from "./PrintReceiptButton";

const RECEIPT_HASH_PATTERN = /^[a-fA-F0-9]{64}$/;

interface Receipt {
  reference: string;
  amount: string;
  token: string;
  date: string;
  network: string;
  status: "pending" | "completed" | "failed";
  recipient: string;
  projectId: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; txHash: string }>;
}): Promise<Metadata> {
  const { locale, txHash } = await params;

  if (!isSupportedLocale(locale)) return {};

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Metadata.receipt" });
  const isValidHash = RECEIPT_HASH_PATTERN.test(txHash);
  const reference = `${txHash.slice(0, 8)}…${txHash.slice(-4)}`;

  return createPageMetadata({
    locale,
    title: isValidHash ? t("titleWithReference", { reference }) : t("title"),
    description: isValidHash
      ? t("descriptionWithReference", { reference })
      : t("description"),
    pathname: `/receipts/${txHash}`,
    indexable: false,
  });
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ txHash: string }>;
}) {
  const { txHash } = await params;
  if (!RECEIPT_HASH_PATTERN.test(txHash)) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/transactions/receipt/${txHash}`, {
      cache: "no-store",
    });
  } catch {
    return <ReceiptUnavailable />;
  }
  if (response.status === 404) notFound();

  if (!response.ok) {
    return <ReceiptUnavailable />;
  }

  const receipt = (await response.json()) as Receipt;

  const network = receipt.network === "Public Global Stellar Network ; September 2015"
    ? "Stellar public network"
    : receipt.network === "Test SDF Network ; September 2015"
      ? "Stellar testnet"
      : receipt.network;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-ink print:bg-white print:text-black">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-greenBright print:text-black">Stardial</p>
          <h1 className="mt-2 text-3xl font-bold">Transaction receipt</h1>
        </div>
        <PrintReceiptButton />
      </header>
      <dl className="grid gap-5 rounded-xl border border-white/15 p-6 print:border-black/20">
        <div><dt className="text-sm text-muted print:text-black">Reference</dt><dd className="break-all font-mono text-sm">{receipt.reference}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Amount (token base units)</dt><dd className="font-semibold">{receipt.amount}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Token</dt><dd className="break-all font-mono text-sm">{receipt.token}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Date (UTC)</dt><dd>{new Date(receipt.date).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "long", timeStyle: "medium" })}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Network</dt><dd>{network}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Status</dt><dd className="capitalize">{receipt.status}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Recipient</dt><dd className="break-all font-mono text-sm">{receipt.recipient}</dd></div>
        <div><dt className="text-sm text-muted print:text-black">Project</dt><dd className="break-all">{receipt.projectId}</dd></div>
      </dl>
    </main>
  );
}

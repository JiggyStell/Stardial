import { Router, Request, Response, NextFunction } from "express";
import {
  transactionHistoryQuerySchema,
  transactionExportQuerySchema,
  type TransactionRecipientQuery,
} from "../schemas/transactions.schemas.js";
import {
  noQuerySchema,
  recipientQuerySchema,
  transactionHashParamsSchema,
  walletAddressParamsSchema,
} from "../schemas/api-input.schemas.js";
import { validateRequest } from "../middleware/validate.js";
import { AppError, ErrorCode, ErrorType } from "../lib/errors.js";
import { toCsvRow } from "../lib/csv.js";
import {
  createPayoutHistoryService,
  type PayoutPage,
  type PayoutRecord,
} from "../services/PayoutHistoryService.js";
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
  InvalidTransactionCursorError,
  type TransactionCursor,
} from "../lib/keyset-cursor.js";
import { authJwtMiddleware } from "../middleware/auth-jwt.js";
import {
  serializeTransactionRecord,
  serializeTransactionRecords,
} from "../serializers/transactions.serializer.js";
import { logger } from "../services/logger.js";
import { getEnv } from "../config/env.js";

/**
 * Backpressure-safe write for HTTP streaming responses.
 *
 * `res.write()` returns `false` when the internal write buffer is full,
 * which means the runtime has accepted the data but the kernel socket
 * buffer is saturated — the client is consuming bytes slower than we are
 * producing them. Continuing to call `res.write()` without waiting causes
 * Node.js to queue chunks in memory, defeating the purpose of streaming
 * and potentially exhausting heap for large exports.
 *
 * When `res.write()` returns `false`, this helper suspends the generator
 * loop until the `drain` event fires (the socket buffer has drained to its
 * low-water mark), then resumes.  If the response is closed before drain
 * fires (client disconnect), the promise resolves immediately so the
 * calling loop can exit cleanly.
 *
 * References: Node.js stream docs — "Event: 'drain'"; issue #33.
 */
export async function drainWrite(res: Response, chunk: string): Promise<void> {
  const flushed = res.write(chunk);
  if (!flushed) {
    await new Promise<void>((resolve) => {
      const onDrain = () => {
        res.removeListener("close", onClose);
        resolve();
      };
      const onClose = () => {
        res.removeListener("drain", onDrain);
        resolve();
      };
      res.once("drain", onDrain);
      res.once("close", onClose);
    });
  }
}

export const transactionsRouter = Router();

// Initialize payout history service
const payoutHistoryService = createPayoutHistoryService();

// Hard ceiling on rows a single export request can stream, independent of
// the caller's own rate limit. Protects the DB and the response from an
// unbounded query even for a fully authorized, well-intentioned caller.
const EXPORT_MAX_ROWS = 50_000;

function decodePageCursor(raw: string | undefined): TransactionCursor | undefined {
  if (raw === undefined) return undefined;

  try {
    return decodeTransactionCursor(raw);
  } catch (error) {
    if (error instanceof InvalidTransactionCursorError) {
      throw new AppError(
        ErrorType.VALIDATION,
        ErrorCode.VALIDATION_ERROR,
        "Invalid pagination cursor.",
        undefined,
        { cursor: "invalid" },
      );
    }
    throw error;
  }
}

function buildPageMetadata(page: PayoutPage, limit: number, offset: number) {
  const last = page.records.at(-1);
  const nextCursor =
    page.hasMore && last
      ? encodeTransactionCursor({ timestamp: last.timestamp, id: last.id })
      : null;

  return { limit, offset, hasMore: page.hasMore, nextCursor };
}

function formatTransactionRow(record: PayoutRecord): (string | number)[] {
  const timestamp = Number.isFinite(record.timestamp)
    ? new Date(record.timestamp * 1000).toISOString()
    : "";
  return [
    record.id,
    record.roundId,
    record.recipient,
    record.amount,
    record.token,
    timestamp,
    record.txHash,
    record.status,
  ];
}

/**
 * @openapi
 * GET /transactions/history
 * summary: Query payout transaction history
 * description: Returns paginated payout records with optional wallet, date, and status filters.
 * tags: [Transactions]
 */
transactionsRouter.get("/history", authJwtMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = transactionHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(
        ErrorType.VALIDATION,
        ErrorCode.VALIDATION_ERROR,
        "Invalid query parameters.",
        undefined,
        parsed.error.flatten()
      );
    }

    const { walletAddress, startDate, endDate, status, limit, offset, cursor } = parsed.data;
    const decodedCursor = decodePageCursor(cursor);

    // Always scope to the authenticated wallet (same rule as /transactions/export).
    const recipient = req.user!.walletAddress;
    if (walletAddress && walletAddress !== recipient) {
      throw new AppError(
        ErrorType.AUTH,
        ErrorCode.UNAUTHORIZED,
        "Cannot read another wallet's transaction history."
      );
    }

    logger.info("Fetching transaction history", {
      walletAddress: recipient,
      startDate,
      endDate,
      status,
      limit,
      offset,
      cursor: decodedCursor ? "provided" : "none",
    });

    const page = await payoutHistoryService.getPayoutsPage({
      recipient,
      startDate,
      endDate,
      status,
      limit,
      offset,
      cursor: decodedCursor,
    });

    return res.status(200).json({
      transactions: serializeTransactionRecords(page.records),
      total: page.total,
      ...buildPageMetadata(page, limit, offset),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * GET /transactions/export
 * summary: Export the authenticated wallet's own transaction history
 * description: >
 *   Requires a valid bearer token. Always scoped to the authenticated
 *   wallet — a caller can never export another wallet's transactions,
 *   regardless of query parameters. `format=csv` (default) streams the
 *   full matching result set as an injection-safe CSV in fixed-size
 *   batches, capped at 50,000 rows. `format=json` returns one
 *   limit/offset page, matching /transactions/history's pagination.
 * tags: [Transactions]
 */
transactionsRouter.get("/export", authJwtMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = transactionExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(
        ErrorType.VALIDATION,
        ErrorCode.VALIDATION_ERROR,
        "Invalid query parameters.",
        undefined,
        parsed.error.flatten()
      );
    }

    const { format, startDate, endDate, status, limit, offset } = parsed.data;
    // Access control: the export is always scoped to the authenticated
    // caller's own wallet, taken from the verified token — never from a
    // request parameter — so one user cannot export another's transactions.
    const recipient = req.user!.walletAddress;

    logger.info("Exporting transaction history", { recipient, format, startDate, endDate, status });

    if (format === "json") {
      const page = await payoutHistoryService.getPayoutsPage({
        recipient,
        startDate,
        endDate,
        status,
        limit,
        offset,
      });
      return res.status(200).json({
        transactions: serializeTransactionRecords(page.records),
        total: page.total,
        ...buildPageMetadata(page, limit, offset),
      });
    }

    // format === "csv": stream the full authorized result set.
    //
    // Transfer-Encoding: chunked tells the client that the response length is
    // unknown up front. Without it, some HTTP/1.1 intermediaries may buffer the
    // whole body before forwarding, re-introducing the memory problem. Express
    // sets this automatically for HTTP/1.1 responses that do not carry a
    // Content-Length, but we set it explicitly here so the intent is clear and
    // so test assertions can verify it. (HTTP/2 uses per-stream flow control
    // instead; this header is stripped by Node.js for h2 connections.)
    const filename = `stardial-transactions-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-store");

    // Track whether the client closed the connection before we finished so
    // the loop can exit early instead of writing into a closed socket.
    let clientGone = false;
    res.once("close", () => { clientGone = true; });

    await drainWrite(res, toCsvRow(["id", "roundId", "recipient", "amount", "token", "timestamp", "txHash", "status"]));

    let rowsWritten = 0;
    let truncated = false;
    for await (const batch of payoutHistoryService.iteratePayouts({ recipient, startDate, endDate, status })) {
      for (const record of batch) {
        if (clientGone) break;
        if (rowsWritten >= EXPORT_MAX_ROWS) {
          truncated = true;
          break;
        }
        // drainWrite suspends here when the write buffer is full (backpressure),
        // resuming only after the socket has drained.  This keeps memory flat
        // regardless of client download speed. See drainWrite() above.
        await drainWrite(res, toCsvRow(formatTransactionRow(record)));
        rowsWritten++;
      }
      if (truncated || clientGone) break;
    }

    if (truncated) {
      logger.warn("Transaction export truncated at row cap", { recipient, cap: EXPORT_MAX_ROWS });
    }

    if (clientGone) {
      logger.info("Transaction export aborted: client disconnected", { recipient, rowsWritten });
      return;
    }

    return res.end();
  } catch (error) {
    return next(error);
  }
});

/** A receipt is generated on demand from the indexed transaction, never from request-supplied fields. */
/**
 * Idempotency guard for mutation-style requests.
 *
 * Clients may send an `Idempotency-Key` header. If the same key is replayed
 * for the same authenticated wallet and route, the original response is
 * returned instead of re-executing the operation, preventing duplicate
 * charges or state changes on client retries.
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_MAX_KEY_LENGTH = 255;
const idempotencyStore = new Map<
  string,
  { status: number; body: unknown; expiresAt: number }
>();

function pruneIdempotencyStore(now: number): void {
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt <= now) idempotencyStore.delete(key);
  }
}

export function getIdempotencyKey(req: Request): string | undefined {
  const raw = req.header("Idempotency-Key");
  if (raw === undefined) return undefined;
  const key = raw.trim();
  if (key.length === 0 || key.length > IDEMPOTENCY_MAX_KEY_LENGTH) {
    throw new AppError(
      ErrorType.VALIDATION,
      ErrorCode.VALIDATION_ERROR,
      "Invalid Idempotency-Key header.",
    );
  }
  return key;
}

/**
 * Returns a cached response for a replayed idempotency key, or undefined if
 * the key is new. Scoped per wallet and route so keys cannot collide across
 * callers.
 */
export function lookupIdempotentResponse(
  scope: string,
  key: string,
): { status: number; body: unknown } | undefined {
  const now = Date.now();
  pruneIdempotencyStore(now);
  const entry = idempotencyStore.get(`${scope}:${key}`);
  if (!entry || entry.expiresAt <= now) return undefined;
  return { status: entry.status, body: entry.body };
}

export function storeIdempotentResponse(
  scope: string,
  key: string,
  status: number,
  body: unknown,
): void {
  idempotencyStore.set(`${scope}:${key}`, {
    status,
    body,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

transactionsRouter.get(
  "/receipt/:txHash",
  validateRequest({ params: transactionHashParamsSchema, query: noQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const txHash = req.params.txHash as string;

      const transaction = await payoutHistoryService.getPayoutByTxHash(txHash);
      if (!transaction) {
        throw new AppError(ErrorType.RPC, ErrorCode.NOT_FOUND, "Transaction not found.");
      }

      return res.status(200).json({
        reference: transaction.txHash,
        amount: transaction.amount,
        token: transaction.token,
        date: Number.isFinite(transaction.timestamp)
          ? new Date(transaction.timestamp * 1000).toISOString()
          : null,
        network: getEnv().SOROBAN_NETWORK_PASSPHRASE,
        status: transaction.status,
        recipient: transaction.recipient,
        projectId: transaction.roundId,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @openapi
 * GET /transactions/{txHash}
 * summary: Get transaction by hash
 * description: Returns a single payout record matching the Stellar transaction hash.
 * tags: [Transactions]
 */
transactionsRouter.get(
  "/:txHash",
  validateRequest({ params: transactionHashParamsSchema, query: noQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const txHash = req.params.txHash as string;

      logger.info("Fetching transaction by hash", { txHash });

      // Search for the transaction by hash
      const results = await payoutHistoryService.searchPayouts(txHash);
      const transaction = results.find(t => t.txHash === txHash);

      if (!transaction) {
        throw new AppError(
          ErrorType.RPC,
          ErrorCode.NOT_FOUND,
          `Transaction with hash ${txHash} not found.`
        );
      }

      return res.status(200).json(serializeTransactionRecord(transaction));
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @openapi
 * GET /transactions/recipient/{walletAddress}
 * summary: List transactions for a recipient
 * description: Returns all payout records sent to the given Stellar wallet address.
 * tags: [Transactions]
 */
transactionsRouter.get(
  "/recipient/:walletAddress",
  validateRequest({ params: walletAddressParamsSchema, query: recipientQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parsed/normalized values from the shared validation layer, never raw params.
      const recipient = req.params.walletAddress as string;
      const { limit, offset, cursor } = res.locals.validatedQuery as TransactionRecipientQuery;
      const decodedCursor = decodePageCursor(cursor);

      logger.info("Fetching transactions for recipient", {
        walletAddress: recipient,
        limit,
        offset,
        cursor: decodedCursor ? "provided" : "none",
      });

      const page = await payoutHistoryService.getPayoutsPage({
        recipient,
        limit,
        offset,
        cursor: decodedCursor,
      });

      return res.status(200).json({
        transactions: serializeTransactionRecords(page.records),
        total: page.total,
        walletAddress: recipient,
        ...buildPageMetadata(page, limit, offset),
      });
    } catch (error) {
      return next(error);
    }
  }
);

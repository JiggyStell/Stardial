import { getStellarRpcServer, loadStellarConfig, executeWithRetry } from "./stellar.js";
import { getDataSource } from "./database.js";
import { incrementDistributionsExecuted, incrementPayoutsConfirmed } from "./metrics.js";
import { TransactionRecord } from "../entities/Transaction.js";
import { ServiceState } from "../entities/ServiceState.js";
import { logger } from "./logger.js";
import { scValToNative } from "@stellar/stellar-sdk";
import { fetchProjectById } from "./splits.service.js";
import { publishSseEvent } from "./SseEventBus.js";
import { getEventBus, TRANSACTION_CONFIRMED } from "./EventBus.js";
import { RpcResponseValidationError } from "../lib/errors.js";
import {
  contractSymbolSchema,
  getEventsResponseSchema,
  getLatestLedgerResponseSchema,
  payoutEventValueSchema,
  type ContractEvent,
} from "../schemas/stellar-rpc.schemas.js";
import {
  decodeContractValue,
  parseRpcResponse,
  rpcResponseValidationError,
} from "./rpc-response-validation.js";
import type { Repository } from "typeorm";

// Polling cadence. Under normal operation we poll every 5s. After a streak of
// consecutive RPC failures we back off to 30s to avoid hammering an RPC that is
// down, then return to the normal cadence on the first successful poll.
export const NORMAL_POLL_INTERVAL_MS = 5_000;
export const BACKOFF_POLL_INTERVAL_MS = 30_000;
export const ERROR_THRESHOLD = 3;

// Catch-up safety. If, on (re)start, the ledger we would resume from is more
// than this many ledgers behind the chain tip, we skip ahead so a prolonged
// outage cannot flood the RPC with thousands of catch-up requests.
export const MAX_CATCHUP_LEDGERS = 10_000;
const STARTUP_LOOKBACK_LEDGERS = 100;

// Upper bound on pages an operator-triggered backfill will scan in one call.
// A replay that would need more than this is a job for a narrower ledger range,
// not a single HTTP request. 200 pages x 100 events bounds the work while still
// covering a multi-day gap in normal traffic.
export const MAX_BACKFILL_PAGES = 200;

// Key under which the polling cursor is persisted in ServiceState so it
// survives process restarts.
export const EVENT_LISTENER_CURSOR_KEY = "event_listener_cursor";
// The cursor is opaque, so retain the corresponding ledger separately for
// operational lag monitoring across restarts.
export const EVENT_LISTENER_LAST_PROCESSED_LEDGER_KEY =
  "event_listener_last_processed_ledger";

export type ServiceStatus = "stopped" | "healthy" | "degraded";

let pollInterval: NodeJS.Timeout | null = null;
let isPolling = false;
let startLedger: number | null = null;
let cursor: string | null = null;

// Resilience state.
let consecutiveErrors = 0;
let lastSuccessfulPoll: string | null = null;
let currentPollDelayMs = NORMAL_POLL_INTERVAL_MS;
let latestObservedLedger: number | null = null;
let lastProcessedLedger: number | null = null;
let lastLedgerObservationAt: string | null = null;

export interface EventListenerLedgerLag {
  latestLedger: number | null;
  lastProcessedLedger: number | null;
  lag: number | null;
  observedAt: string | null;
}

/**
 * Returns the listener's distance from the latest ledger seen in a successful
 * `getEvents` response. `lag` is null until the worker has processed an event
 * ledger (for example immediately after a cursor-only restart).
 */
export function getLedgerLag(): EventListenerLedgerLag {
  const lag = latestObservedLedger !== null && lastProcessedLedger !== null
    ? Math.max(0, latestObservedLedger - lastProcessedLedger)
    : null;

  return {
    latestLedger: latestObservedLedger,
    lastProcessedLedger,
    lag,
    observedAt: lastLedgerObservationAt,
  };
}

/**
 * (Re)arms the polling timer at the requested cadence. Idempotent: if the timer
 * is already running at `delayMs`, it is left untouched so we don't churn timers
 * on every poll.
 */
function schedulePolling(delayMs: number): void {
  if (pollInterval && currentPollDelayMs === delayMs) {
    return;
  }

  if (pollInterval) {
    clearInterval(pollInterval);
  }

  currentPollDelayMs = delayMs;
  pollInterval = setInterval(() => {
    void pollEvents();
  }, delayMs);
}

/**
 * Caps how far back polling may resume. If `desiredStartLedger` is more than
 * {@link MAX_CATCHUP_LEDGERS} behind `latestLedger`, returns a ledger that is
 * exactly `MAX_CATCHUP_LEDGERS` behind the tip and logs a warning. Otherwise
 * returns `desiredStartLedger` unchanged.
 */
export function capCatchUpWindow(
  latestLedger: number,
  desiredStartLedger: number
): number {
  if (latestLedger - desiredStartLedger > MAX_CATCHUP_LEDGERS) {
    const capped = latestLedger - MAX_CATCHUP_LEDGERS;
    logger.warn(
      `EventListenerService: requested start ledger ${desiredStartLedger} is more than ${MAX_CATCHUP_LEDGERS} ledgers behind tip ${latestLedger}; advancing to ${capped} to bound catch-up.`
    );
    return capped;
  }
  return desiredStartLedger;
}

export async function startEventListenerService() {
  if (pollInterval) {
    logger.warn("EventListenerService is already running");
    return;
  }

  logger.info("Starting EventListenerService background worker...");

  consecutiveErrors = 0;

  try {
    const server = getStellarRpcServer();
    const stateRepo = getDataSource().getRepository(ServiceState);
    const persistedCursor = await stateRepo.findOneBy({ key: EVENT_LISTENER_CURSOR_KEY });
    const persistedLedger = await stateRepo.findOneBy({
      key: EVENT_LISTENER_LAST_PROCESSED_LEDGER_KEY,
    });
    const parsedPersistedLedger = Number(persistedLedger?.value);
    lastProcessedLedger = Number.isSafeInteger(parsedPersistedLedger) && parsedPersistedLedger >= 0
      ? parsedPersistedLedger
      : null;

    if (persistedCursor?.value) {
      cursor = persistedCursor.value;
      startLedger = null;
      logger.info("Initialized EventListenerService from persisted cursor");
      schedulePolling(NORMAL_POLL_INTERVAL_MS);
      return;
    }

    const latestLedger = parseRpcResponse(
      "getLatestLedger",
      getLatestLedgerResponseSchema,
      await executeWithRetry(() => server.getLatestLedger(), {
        operation: "getLatestLedger"
      })
    );

    // Start polling from a small lookback to cover restart gaps, but never more
    // than MAX_CATCHUP_LEDGERS behind the tip.
    const desiredStart = Math.max(1, latestLedger.sequence - STARTUP_LOOKBACK_LEDGERS);
    startLedger = capCatchUpWindow(latestLedger.sequence, desiredStart);

    logger.info(
      `Initialized EventListenerService to start polling from ledger: ${startLedger}`
    );
  } catch (error) {
    logger.error(
      "Failed to determine EventListenerService start position. Polling from latest.",
      { error }
    );
  }

  schedulePolling(NORMAL_POLL_INTERVAL_MS);
}

export function stopEventListenerService() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    currentPollDelayMs = NORMAL_POLL_INTERVAL_MS;
    consecutiveErrors = 0;
    logger.info("EventListenerService background worker stopped cleanly.");
  }
}

/**
 * Health snapshot consumed by the readiness health check.
 *
 * - `status`: `stopped` (not running), `healthy` (running, no failure streak),
 *   or `degraded` (running but in an RPC failure back-off).
 * - `lastSuccessfulPoll`: ISO timestamp of the last poll that completed without
 *   error, or `null` if none yet.
 * - `consecutiveErrors`: number of consecutive failing polls.
 */
export function getServiceHealth(): {
  status: ServiceStatus;
  lastSuccessfulPoll: string | null;
  consecutiveErrors: number;
} {
  let status: ServiceStatus;
  if (!pollInterval) {
    status = "stopped";
  } else if (consecutiveErrors >= ERROR_THRESHOLD) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return { status, lastSuccessfulPoll, consecutiveErrors };
}

function readEventContractId(contractId: unknown): string | undefined {
  const contract = contractId as { contractId?: () => unknown } | undefined;
  if (typeof contract?.contractId !== "function") return undefined;
  const id = contract.contractId();
  return typeof id === "string" ? id : undefined;
}

/**
 * Issue #1494: validates a `payment_sent` / `collaborator_claimed` event and
 * returns the fields persisted as a completed payment. Throws
 * `RpcResponseValidationError` if the event did not come from the configured
 * contract, or its project ID, recipient or amount is malformed.
 */
function decodePayoutEvent(
  event: ContractEvent,
  eventName: string,
  projectIdTopic: string | undefined,
  expectedContractId: string
) {
  const method = `getEvents:${eventName}`;
  if (readEventContractId(event.contractId) !== expectedContractId) {
    throw rpcResponseValidationError(method, [
      { path: "contractId", message: "does not match the configured contract" },
    ]);
  }
  const projectId = contractSymbolSchema.safeParse(projectIdTopic);
  if (!projectId.success) {
    throw rpcResponseValidationError(method, [
      { path: "topic.1", message: "must be a project ID symbol" },
    ]);
  }
  const [recipient, amount] = decodeContractValue(method, payoutEventValueSchema, event.value);
  return {
    projectId: projectId.data,
    recipient,
    amount: amount.toString(),
    timestamp: Math.floor(Date.parse(event.ledgerClosedAt) / 1000),
  };
}

const PAYOUT_EVENT_NAMES: ReadonlySet<string> = new Set([
  "payment_sent",
  "collaborator_claimed",
  "distribution_complete",
]);

/** Reads event topics as strings; an undecodable topic becomes "". */
function readEventTopics(event: ContractEvent): string[] {
  return (event.topic ?? []).map((topic) => {
    try {
      return String(scValToNative(topic));
    } catch {
      return "";
    }
  });
}

/** Resolves a project's token address, falling back to "Native". */
async function resolveProjectToken(
  projectId: string,
  cache?: Map<string, string>,
): Promise<string> {
  const cached = cache?.get(projectId);
  if (cached !== undefined) return cached;

  let token = "Native";
  try {
    const project = await fetchProjectById(projectId);
    if (project && typeof project === "object" && "token" in project) {
      token = String(project.token);
    }
  } catch (err) {
    logger.warn(
      `Could not resolve token address for project ${projectId}. Using fallback.`,
      { err }
    );
  }

  cache?.set(projectId, token);
  return token;
}

interface CollectedEvents {
  records: TransactionRecord[];
  /** `distribution_complete` milestones observed in the batch. */
  distributionsCompleted: number;
}

/**
 * Turns a page of contract events into payout transaction records.
 *
 * Shared by the live poll and the operator-driven backfill so both paths decode
 * exactly the same events the same way. A malformed payout event fails the
 * whole batch (#1494): skipping it would leave money unrecorded while the
 * cursor still advanced.
 *
 * `skipExisting` avoids redundant token lookups during live polling. Backfill
 * leaves it off because the rows it replays are usually already present; the
 * txHash unique constraint makes the upsert idempotent instead.
 *
 * `recordPayoutMetrics` is off for backfill: a replay of historical events
 * must not inflate the process-lifetime `payouts_confirmed_total` counter.
 */
async function collectPayoutRecords(
  events: ContractEvent[],
  expectedContractId: string,
  repo: Repository<TransactionRecord>,
  options: {
    skipExisting: boolean;
    tokenCache?: Map<string, string>;
    recordPayoutMetrics?: boolean;
  } = { skipExisting: true },
): Promise<CollectedEvents> {
  const records: TransactionRecord[] = [];
  let distributionsCompleted = 0;

  for (const event of events) {
    try {
      const topics = readEventTopics(event);
      const eventName = topics[0] || "";
      if (!PAYOUT_EVENT_NAMES.has(eventName)) {
        continue;
      }

      if (eventName === "distribution_complete") {
        distributionsCompleted += 1;
        logger.info("Indexed milestone event", {
          eventName,
          projectId: topics[1] || "",
          txHash: event.txHash,
          ledgerClosedAt: event.ledgerClosedAt,
        });
        continue;
      }

      const { projectId, recipient, amount, timestamp } = decodePayoutEvent(
        event,
        eventName,
        topics[1],
        expectedContractId
      );

      // Skip already-indexed transactions during live polling. The DB also
      // enforces uniqueness on txHash, but this avoids redundant work.
      if (options.skipExisting) {
        const existing = await repo.findOneBy({ txHash: event.txHash });
        if (existing) {
          continue;
        }
      }

      const token = await resolveProjectToken(projectId, options.tokenCache);
      if (options.recordPayoutMetrics) {
        incrementPayoutsConfirmed(token);
      }

      records.push(
        repo.create({
          roundId: projectId,
          recipient,
          amount,
          token,
          timestamp,
          txHash: event.txHash,
          status: "completed",
        })
      );
    } catch (eventError) {
      // Fail the whole batch: skipping would advance the cursor past a
      // payment that was never recorded.
      if (eventError instanceof RpcResponseValidationError) {
        throw eventError;
      }
      logger.error("Error processing polled Soroban event", {
        event,
        error: eventError,
      });
    }
  }

  return { records, distributionsCompleted };
}

/** Records a failed poll and backs off the cadence once the threshold is hit. */
function recordPollFailure(error: unknown): void {
  consecutiveErrors += 1;
  logger.error("Error occurred in background Soroban event poll", {
    error,
    consecutiveErrors,
  });

  if (consecutiveErrors >= ERROR_THRESHOLD && currentPollDelayMs !== BACKOFF_POLL_INTERVAL_MS) {
    logger.warn(
      `EventListenerService: ${consecutiveErrors} consecutive poll failures; backing off poll interval to ${BACKOFF_POLL_INTERVAL_MS}ms.`
    );
    schedulePolling(BACKOFF_POLL_INTERVAL_MS);
  }
}

/** Records a successful poll and resets the cadence after a failure streak. */
function recordPollSuccess(): void {
  if (consecutiveErrors > 0) {
    logger.info(
      `EventListenerService: recovered after ${consecutiveErrors} consecutive failure(s).`
    );
  }
  consecutiveErrors = 0;
  lastSuccessfulPoll = new Date().toISOString();

  if (currentPollDelayMs !== NORMAL_POLL_INTERVAL_MS) {
    logger.info(
      `EventListenerService: resetting poll interval to ${NORMAL_POLL_INTERVAL_MS}ms after recovery.`
    );
    schedulePolling(NORMAL_POLL_INTERVAL_MS);
  }
}

export async function pollEvents() {
  if (isPolling) return;

  isPolling = true;

  try {
    const config = loadStellarConfig();
    const server = getStellarRpcServer();
    const dataSource = getDataSource();
    const repo = dataSource.getRepository(TransactionRecord);

    const filters = [
      {
        type: "contract" as const,
        contractIds: [config.contractId],
      },
    ];

    const filterOptions: Parameters<typeof server.getEvents>[0] = cursor
      ? { filters, cursor, limit: 100 }
      : startLedger
      ? { filters, startLedger, limit: 100 }
      : { filters, cursor: "", limit: 100 };

    // Issue #1494: validate before reading anything. A malformed response
    // throws here, so nothing is recorded and the cursor does not move.
    // `latestLedger` and each event's `ledger` stay optional for
    // compatibility with older RPC servers.
    const response = parseRpcResponse(
      "getEvents",
      getEventsResponseSchema,
      await executeWithRetry(() => server.getEvents(filterOptions), {
        operation: "getEvents"
      })
    );
    const responseEvents = response.events;
    // An empty successful query has scanned through `latestLedger`, even if
    // the contract emitted no matching events. Treat that as caught up so a
    // quiet contract still exports a useful zero-lag gauge.
    const batchLastProcessedLedger = Math.max(
      lastProcessedLedger ?? 0,
      ...(responseEvents
        .map((event) => event.ledger)
        .filter((ledger): ledger is number => ledger !== undefined)),
      responseEvents.length === 0 ? response.latestLedger ?? latestObservedLedger ?? 0 : 0,
    );

    const collected = await collectPayoutRecords(
      responseEvents,
      config.contractId,
      repo,
      { skipExisting: true, recordPayoutMetrics: true }
    );
    const newRecords = collected.records;

    // `distribution_complete` is the only event that means an actual
    // distribution round settled on-chain, so it is what the
    // `distributions_executed_total` counter counts.
    if (collected.distributionsCompleted > 0) {
      incrementDistributionsExecuted(collected.distributionsCompleted);
    }

    if (response.latestLedger !== undefined) {
      latestObservedLedger = response.latestLedger;
      lastLedgerObservationAt = new Date().toISOString();
    }

    const nextCursor = response.cursor ?? cursor;

    // Persist the new records AND the advanced cursor in a single transaction,
    // so after a restart we never skip events relative to what was committed,
    // nor re-process a batch that was already committed (Issue #619).
    if (
      newRecords.length > 0 ||
      (nextCursor && nextCursor !== cursor) ||
      batchLastProcessedLedger > (lastProcessedLedger ?? 0)
    ) {
      await dataSource.transaction(async (manager) => {
        if (newRecords.length > 0) {
          await manager.upsert(TransactionRecord, newRecords, {
            conflictPaths: ["txHash"],
            skipUpdateIfNoValuesChanged: true,
          });
        }
        if (nextCursor) {
          await manager.upsert(
            ServiceState,
            { key: EVENT_LISTENER_CURSOR_KEY, value: nextCursor },
            { conflictPaths: ["key"] }
          );
        }
        if (batchLastProcessedLedger > (lastProcessedLedger ?? 0)) {
          await manager.upsert(
            ServiceState,
            {
              key: EVENT_LISTENER_LAST_PROCESSED_LEDGER_KEY,
              value: String(batchLastProcessedLedger),
            },
            { conflictPaths: ["key"] }
          );
        }
      });

      if (newRecords.length > 0) {
        logger.info(
          `Upserted ${newRecords.length} transaction record(s) from current event batch.`
        );

        // Real-time push: notify the generic event bus (Issue #618) and the
        // txHash-keyed SSE bus so connected clients are updated immediately.
        for (const record of newRecords) {
          getEventBus().emit(TRANSACTION_CONFIRMED, record);
          publishSseEvent(record.txHash, {
            txHash: record.txHash,
            roundId: record.roundId,
            recipient: record.recipient,
            amount: record.amount,
            token: record.token,
            timestamp: record.timestamp,
            status: record.status,
          });
        }
      }
    }

    // Advance the in-memory cursor and emit SSE only after a successful commit.
    if (nextCursor) {
      cursor = nextCursor;
      startLedger = null;
    }
    if (batchLastProcessedLedger > (lastProcessedLedger ?? 0)) {
      lastProcessedLedger = batchLastProcessedLedger;
    }
    recordPollSuccess();
  } catch (error) {
    recordPollFailure(error);
  } finally {
    isPolling = false;
  }
}

export interface EventBackfillResult {
  fromLedger: number;
  /** Payout records upserted; already-indexed rows are updated in place. */
  recordsIndexed: number;
  pagesScanned: number;
  lastLedgerScanned: number | null;
  /** False when the page budget ran out before the replay caught up. */
  caughtUp: boolean;
}

/**
 * Replays contract events from `fromLedger` forward, upserting payout records.
 *
 * This backs the `POST /ops/backfill` recovery step in the payout runbooks: it
 * closes gaps left by an event-listener outage. It deliberately leaves the live
 * cursor and the listener's health state alone, and it is safe to run while
 * polling is active because records are keyed by txHash, so an overlapping
 * range is a replay rather than a duplicate.
 *
 * Rejecting an invalid `fromLedger` matters: this runs under incident
 * pressure, and silently ignoring the range would look like a successful
 * backfill while nothing was indexed.
 */
export async function backfillEvents(fromLedger: number): Promise<EventBackfillResult> {
  if (!Number.isSafeInteger(fromLedger) || fromLedger <= 0) {
    throw new RangeError("fromLedger must be a positive integer ledger sequence.");
  }

  const config = loadStellarConfig();
  const server = getStellarRpcServer();
  const repo = getDataSource().getRepository(TransactionRecord);
  const filters = [{ type: "contract" as const, contractIds: [config.contractId] }];
  const tokenCache = new Map<string, string>();

  let startLedger: number | null = fromLedger;
  let cursor: string | null = null;
  let pagesScanned = 0;
  let recordsIndexed = 0;
  let lastLedgerScanned: number | null = null;
  let caughtUp = false;

  for (let page = 0; page < MAX_BACKFILL_PAGES; page += 1) {
    const response = parseRpcResponse(
      "getEvents",
      getEventsResponseSchema,
      await executeWithRetry(
        () =>
          server.getEvents(
            cursor
              ? { filters, cursor, limit: 100 }
              : { filters, startLedger: startLedger ?? fromLedger, limit: 100 }
          ),
        { operation: "getEvents" }
      )
    );

    pagesScanned += 1;

    const collected = await collectPayoutRecords(response.events, config.contractId, repo, {
      skipExisting: false,
      tokenCache,
    });
    if (collected.records.length > 0) {
      await repo.upsert(collected.records, {
        conflictPaths: ["txHash"],
        skipUpdateIfNoValuesChanged: true,
      });
      recordsIndexed += collected.records.length;
    }

    for (const event of response.events) {
      if (event.ledger === undefined) continue;
      lastLedgerScanned = Math.max(lastLedgerScanned ?? 0, event.ledger);
    }

    // Stop on an empty page (caught up), when the RPC stops advancing the
    // cursor, or when it cannot advance any further. Without the cursor check
    // a non-advancing response would spin until the page budget ran out.
    if (
      response.events.length === 0 ||
      !response.cursor ||
      response.cursor === cursor
    ) {
      caughtUp = true;
      break;
    }

    cursor = response.cursor;
    startLedger = null;
  }

  if (!caughtUp) {
    logger.warn("Event backfill stopped at the page budget before catching up", {
      fromLedger,
      pagesScanned,
      lastLedgerScanned,
    });
  }

  logger.info("Event backfill completed", {
    fromLedger,
    recordsIndexed,
    pagesScanned,
    lastLedgerScanned,
    caughtUp,
  });

  return { fromLedger, recordsIndexed, pagesScanned, lastLedgerScanned, caughtUp };
}

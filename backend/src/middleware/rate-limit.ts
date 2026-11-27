import { sendErrorResponse } from "../lib/api-error.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger.js";

/**
 * Issue #1462: per-route rate limit policies.
 *
 * Every route group is mapped to a named, declarative policy instead of a
 * loose set of module constants. Limits are discoverable via
 * `listRateLimitPolicies()`, configurable via environment variables, and
 * auditable per route group.
 *
 * Layering (outermost first):
 *   1. `global`  — volumetric safety net applied to every request
 *   2. `auth`    — credential-stuffing / replay bursts
 *   3. `admin`   — payments-admin surface
 *   4. `read`    — general reads
 *   5. `write`   — mutations
 *   6. `sse`     — event-stream connection rate
 *
 * Every rejected request is logged at warn level with the policy name, client
 * identity, method and path so abuse can be monitored.
 */

export type RateLimitPolicyName =
  | "global"
  | "read"
  | "write"
  | "admin"
  | "auth"
  | "sse";

export interface RateLimitPolicy {
  name: RateLimitPolicyName;
  /** Human-readable summary surfaced by docs and the policy-listing helper. */
  description: string;
  /** Length of the rate-limit window, in milliseconds. */
  windowMs: number;
  /** Maximum requests permitted per window, per client identity. */
  limit: number;
  /** Environment variables that override `windowMs` / `limit`. */
  env: {
    windowMs: string;
    limit: string;
  };
}

/**
 * Reads a strictly-positive integer from the environment. Unset, empty,
 * non-numeric, zero and negative values all fall back to `fallback` so a bad
 * override can never *disable* rate limiting.
 */
function readPositiveInt(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Resolved policy table. Values reflect the environment at import time;
 * callers that need the effective configuration should use
 * `listRateLimitPolicies()` rather than re-reading `process.env`.
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  global: {
    name: "global",
    description: "Volumetric safety net applied to every request.",
    windowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_GLOBAL_MAX", 500),
    env: { windowMs: "RATE_LIMIT_WINDOW_MS", limit: "RATE_LIMIT_GLOBAL_MAX" },
  },
  read: {
    name: "read",
    description: "General read endpoints (GET on resource collections).",
    windowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_MAX", 100),
    env: { windowMs: "RATE_LIMIT_WINDOW_MS", limit: "RATE_LIMIT_MAX" },
  },
  write: {
    name: "write",
    description: "Mutation endpoints (create/update/delete).",
    windowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_WRITE_MAX", 30),
    env: { windowMs: "RATE_LIMIT_WINDOW_MS", limit: "RATE_LIMIT_WRITE_MAX" },
  },
  admin: {
    name: "admin",
    description: "Payments-admin endpoints under /splits/admin.",
    windowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_ADMIN_MAX", 20),
    env: { windowMs: "RATE_LIMIT_WINDOW_MS", limit: "RATE_LIMIT_ADMIN_MAX" },
  },
  auth: {
    name: "auth",
    description: "Auth / wallet endpoints (credential-stuffing protection).",
    windowMs: readPositiveInt("RATE_LIMIT_AUTH_WINDOW_MS", DEFAULT_AUTH_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_AUTH_MAX", 10),
    env: { windowMs: "RATE_LIMIT_AUTH_WINDOW_MS", limit: "RATE_LIMIT_AUTH_MAX" },
  },
  sse: {
    name: "sse",
    description: "Server-Sent Events connection rate.",
    windowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    limit: readPositiveInt("RATE_LIMIT_SSE_MAX", 20),
    env: { windowMs: "RATE_LIMIT_WINDOW_MS", limit: "RATE_LIMIT_SSE_MAX" },
  },
};

/** Returns the resolved policy for a route group. */
export function getRateLimitPolicy(name: RateLimitPolicyName): RateLimitPolicy {
  return RATE_LIMIT_POLICIES[name];
}

/** Returns every resolved policy, for docs and contract tests. */
export function listRateLimitPolicies(): RateLimitPolicy[] {
  return Object.values(RATE_LIMIT_POLICIES);
}

/**
 * Per-client identity. Prefers the authenticated user id when present,
 * otherwise falls back to the client IP. Each limiter owns its own store, so
 * budgets are isolated per endpoint group.
 */
function clientKey(req: Request): string {
  const user = (req as Request & { user?: { id?: string } }).user;
  if (user?.id) return `user:${user.id}`;
  // Use ipKeyGenerator for IPv6-safe IP extraction (express-rate-limit v8+ requirement).
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

function rateLimitHandler(req: Request, res: Response) {
  const requestId = res.locals.requestId as string | undefined;
  logger.warn("Rate limit exceeded", {
    policy: res.locals.rateLimitPolicy as string | undefined,
    client: clientKey(req),
    method: req.method,
    path: req.path,
    requestId,
  });
  return sendErrorResponse(res, 429, {
    error: "rate_limited",
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    retryAfter: res.getHeader("Retry-After"),
    requestId,
  });
}

type RateLimitOptions = Parameters<typeof rateLimit>[0];

function createLimiter(
  policy: RateLimitPolicy,
  overrides: Partial<RateLimitOptions> = {},
) {
  return rateLimit({
    windowMs: policy.windowMs,
    limit: policy.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
    handler: rateLimitHandler,
    ...overrides,
  });
}

/**
 * Records the policy name on the response before the limiter runs, so the
 * rejection handler can log which budget was exhausted.
 */
function tagged(
  policy: RateLimitPolicy,
  limiter: ReturnType<typeof createLimiter>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.rateLimitPolicy = policy.name;
    return limiter(req, res, next);
  };
}

/**
 * Global safety-net limiter — applied to EVERY route.
 * Protects the process from catastrophic volumetric floods.
 */
export const globalLimiter = tagged(
  RATE_LIMIT_POLICIES.global,
  createLimiter(RATE_LIMIT_POLICIES.global, {
    // Skip well-known health check calls from internal monitors.
    skip: (req) => req.path === "/health" && req.method === "GET",
  }),
);

/** General read endpoints. */
export const readLimiter = tagged(
  RATE_LIMIT_POLICIES.read,
  createLimiter(RATE_LIMIT_POLICIES.read),
);

/** Write / mutation endpoints. */
export const writeLimiter = tagged(
  RATE_LIMIT_POLICIES.write,
  createLimiter(RATE_LIMIT_POLICIES.write),
);

/** Admin endpoints. */
export const adminLimiter = tagged(
  RATE_LIMIT_POLICIES.admin,
  createLimiter(RATE_LIMIT_POLICIES.admin),
);

/** Auth / wallet endpoints — strict burst cap against credential stuffing. */
export const authLimiter = tagged(
  RATE_LIMIT_POLICIES.auth,
  createLimiter(RATE_LIMIT_POLICIES.auth),
);

/** SSE connection limiter — protects event stream endpoints. */
export const sseConnectionLimiter = tagged(
  RATE_LIMIT_POLICIES.sse,
  createLimiter(RATE_LIMIT_POLICIES.sse),
);

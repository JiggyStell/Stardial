import type { NextFunction, Request, Response } from "express";
import { getDataSource } from "../services/database.js";
import { AuditLog } from "../entities/AuditLog.js";
import { hashIp } from "./payments-admin.js";
import { logger } from "../services/logger.js";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_KEYS = new Set(["api_key", "apiKey", "authorization", "password", "secret", "token"]);

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  const sanitized: Record<string, unknown> = Object.create(null);
  const rawObj = obj as Record<string, unknown>;
  for (const key of Object.keys(rawObj)) {
    if (typeof key !== "string") {
      continue;
    }
    if (
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype" ||
      key.startsWith("__") ||
      /[[\]./\\]/.test(key)
    ) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(rawObj, key)) {
      continue;
    }
    const val = rawObj[key];
    if (SENSITIVE_KEYS.has(key) || /key|token|password|secret/i.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeObject(val);
    }
  }
  return sanitized;
}

function deriveAction(req: Request): string {
  const path = req.path.replace(/^\/+/, "");
  const segments = path.split("/").filter(Boolean);
  const resource = segments[segments.length - 1] ?? "unknown";
  return resource.replace(/-/g, "_");
}

function buildPayload(req: Request): Record<string, unknown> | null {
  const body = req.body;
  if (body === undefined || body === null) {
    return null;
  }
  if (typeof body === "object" && !Array.isArray(body)) {
    return sanitizeObject(body) as Record<string, unknown>;
  }
  return { value: sanitizeObject(body) };
}

function buildFailureMetadata(req: Request, res: Response): Record<string, unknown> {
  return {
    action: deriveAction(req),
    requestId: String(res.locals.requestId ?? ""),
    route: req.originalUrl,
    statusCode: res.statusCode,
  };
}

async function persistAuditLog(
  req: Request,
  res: Response,
  outcome: "success" | "failure"
): Promise<void> {
  try {
    const dataSource = getDataSource();
    const repository = dataSource.getRepository(AuditLog);
    const actorIdentity = String(req.headers["x-admin-actor"] || req.ip || "unknown");
    const actionName = deriveAction(req);
    const reqId = String(res.locals.requestId ?? "");
    const ipH = hashIp(req.ip);
    const oldVals = req.method === "PUT" || req.method === "PATCH" ? (sanitizeObject(req.body) as Record<string, unknown>) : null;
    const payloadVal = outcome === "success" ? buildPayload(req) : buildFailureMetadata(req, res);

    const entry = repository.create({
      action: actionName,
      ipHash: ipH,
      requestId: reqId,
      actorIdentity,
      oldValues: oldVals,
      payload: payloadVal
    });
    await repository.save(entry);
  } catch (error) {
    logger.error("Failed to persist admin audit log", { error, path: req.originalUrl });
  }
}

/**
 * Records an audit log row after each admin mutation under /splits/admin.
 * Successful mutations (2xx) are logged with the request payload, actor identity, timestamps, and old/new values.
 * Failed mutations (non-2xx) are logged with sanitized failure metadata.
 */
export function auditAdminMutationsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on("finish", () => {
    const outcome = res.statusCode >= 200 && res.statusCode < 300
      ? "success"
      : "failure";
    void persistAuditLog(req, res, outcome);
  });

  next();
}

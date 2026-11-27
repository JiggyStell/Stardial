import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError, ErrorCode, ErrorType } from "../lib/errors.js";

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  /** Selected request headers; unknown standard headers are intentionally ignored. */
  headers?: ZodTypeAny;
}

/**
 * Zod's default `unrecognized_keys` message repeats the offending key name.
 * Replace it with a fixed message so hostile field names can never be
 * reflected in a client-facing 400 response.
 */
function clientSafeValidationError(error: ZodError): ZodError {
  const issues = error.issues.map((issue) =>
    issue.code === "unrecognized_keys" ? { ...issue, message: "Unexpected field." } : issue
  );
  return new ZodError(issues);
}

/**
 * Shared request-validation layer. Parsed (trimmed, normalized) body/params
 * values replace the raw request values, while parsed query and selected header
 * values are exposed as `res.locals.validatedQuery` / `res.locals.validatedHeaders`
 * because Node defines `req.query` as a getter-only accessor. Failures are
 * forwarded to the central error handler, which returns the standard 400
 * validation envelope with `details.fieldErrors` / `details.formErrors`.
 */

/** Methods whose requests may carry a body that must satisfy a schema. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/** A request body is expected to be a JSON object, never an array or a scalar. */
export function isJsonObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function invalidBodyShapeError(): AppError {
  return new AppError(
    ErrorType.VALIDATION,
    ErrorCode.VALIDATION_ERROR,
    "Request body must be a JSON object."
  );
}

/**
 * App-wide guard: every write route in this API takes an object body, but
 * `express.json()` also parses a top-level JSON array. An array would reach a
 * handler as `req.body` with none of the fields its schema checks, so it is
 * rejected before any handler, cache or storage runs.
 *
 * A request with no body (`req.body` undefined) is left to the route schema,
 * which reports the missing required fields.
 */
export const requireJsonObjectBody: RequestHandler = (req, _res, next) => {
  if (!BODY_METHODS.has(req.method)) return next();
  const body = req.body;
  if (body === undefined || isJsonObjectBody(body)) return next();
  return next(invalidBodyShapeError());
};

/**
 * Validates `req.body`, `req.params` and `req.query` against the supplied
 * schemas and replaces them with the parsed (typed, transformed) values. The
 * body must be a JSON object: arrays and scalars are rejected before parsing.
 */
export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        if (!isJsonObjectBody(req.body)) {
          throw invalidBodyShapeError();
        }
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // Node's `req.query` is a getter-only accessor in newer runtimes, so
        // parsed query values are exposed on res.locals instead of assigned.
        const parsedQuery = schemas.query.safeParse(req.query);
        if (!parsedQuery.success) throw clientSafeValidationError(parsedQuery.error);
        res.locals.validatedQuery = parsedQuery.data;
      }
      if (schemas.headers) {
        const parsedHeaders = schemas.headers.safeParse(req.headers);
        if (!parsedHeaders.success) throw clientSafeValidationError(parsedHeaders.error);
        res.locals.validatedHeaders = parsedHeaders.data;
      }
      next();
    } catch (error) {
      next(error instanceof ZodError ? clientSafeValidationError(error) : error);
    }
  };
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestTimeout } from "../middleware/timeout.js";
import type { Request, Response, NextFunction } from "express";

function makeRes(overrides: Partial<Response> & { locals?: Record<string, unknown> } = {}): Response {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    on: vi.fn((event: string, cb: () => void) => { (listeners[event] ??= []).push(cb); }),
    emit: (event: string) => listeners[event]?.forEach((cb) => cb()),
    locals: { requestId: "test-correlation-id" },
    ...overrides,
  } as unknown as Response;
}

describe("requestTimeout middleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls next immediately", () => {
    const next = vi.fn() as unknown as NextFunction;
    requestTimeout(1000)({} as Request, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("sends 504 with gateway_timeout error after timeout when headers not sent", () => {
    const res = makeRes();
    requestTimeout(50)({} as Request, res, vi.fn() as unknown as NextFunction);

    vi.advanceTimersByTime(60);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({
      error: "gateway_timeout",
      code: "GATEWAY_TIMEOUT",
      message: "Request timed out.",
      requestId: "test-correlation-id",
      details: {},
    });
  });

  it("includes correlation ID (requestId) from res.locals in timeout response", () => {
    const res = makeRes({ locals: { requestId: "custom-id-123" } });
    requestTimeout(50)({} as Request, res, vi.fn() as unknown as NextFunction);

    vi.advanceTimersByTime(60);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "custom-id-123" }),
    );
  });

  it("does not send timeout response if headers were already sent", () => {
    const res = makeRes({ headersSent: true });
    requestTimeout(50)({} as Request, res, vi.fn() as unknown as NextFunction);

    vi.advanceTimersByTime(60);

    expect(res.json).not.toHaveBeenCalled();
  });

  it("clears timer when response finishes before timeout", () => {
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requestTimeout(1000)({} as Request, res, next);

    // Response finishes before timeout
    res.emit("finish");

    // Advance past the timeout
    vi.advanceTimersByTime(2000);

    // Timeout callback should not have fired
    expect(res.json).not.toHaveBeenCalled();
  });

  it("clears timer when response closes before timeout", () => {
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requestTimeout(1000)({} as Request, res, next);

    // Connection closes before timeout
    res.emit("close");

    vi.advanceTimersByTime(2000);

    expect(res.json).not.toHaveBeenCalled();
  });

  it("does not send partial response mixed with timeout body", () => {
    const res = makeRes();

    // Simulate partial response already sent
    res.headersSent = true;

    requestTimeout(50)({} as Request, res, vi.fn() as unknown as NextFunction);

    vi.advanceTimersByTime(60);

    // json should not be called because headers were already sent
    expect(res.json).not.toHaveBeenCalled();
  });

  it("uses default 30s timeout when no argument is passed", () => {
    const res = makeRes();
    requestTimeout()({} as Request, res, vi.fn() as unknown as NextFunction);

    // Advance 29s — should not fire
    vi.advanceTimersByTime(29_000);
    expect(res.json).not.toHaveBeenCalled();

    // Advance past 30s — should fire
    vi.advanceTimersByTime(2_000);
    expect(res.status).toHaveBeenCalledWith(504);
  });
});

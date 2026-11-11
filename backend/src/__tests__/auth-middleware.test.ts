import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
  requireStellarAddress,
  requireProjectAccess,
  STELLAR_ADDRESS_HEADER,
} from "../middleware/project-access.js";
import { AppError, ErrorCode, ErrorType } from "../lib/errors.js";

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    params: {},
    ip: "127.0.0.1",
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(overrides: Partial<Response> = {}): Response {
  return {
    locals: {},
    ...overrides,
  } as unknown as Response;
}

// Typed with an explicit plain-function signature: bare vi.fn() is
// Mock<Procedure | Constructable>, whose construct signature cannot stand in
// for NextFunction. Typing it via ReturnType<NextFunction> collapses to
// `void` instead, which is not callable at all.
type MockNext = ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

function createMockNext(): MockNext {
  return vi.fn<(...args: unknown[]) => void>();
}

const VALID_STELLAR_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const ANOTHER_VALID_ADDRESS = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const INVALID_ADDRESS = "not-a-stellar-address";

describe("requireStellarAddress", () => {
  let req: Request;
  let res: Response;
  let next: MockNext;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should pass when valid stellar address header is present", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = VALID_STELLAR_ADDRESS;

    requireStellarAddress(req, res, next);

    expect(res.locals.requesterAddress).toBe(VALID_STELLAR_ADDRESS);
    expect(next).toHaveBeenCalledWith();
  });

  it("should trim whitespace from the address header", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = `  ${VALID_STELLAR_ADDRESS}  `;

    requireStellarAddress(req, res, next);

    expect(res.locals.requesterAddress).toBe(VALID_STELLAR_ADDRESS);
    expect(next).toHaveBeenCalledWith();
  });

  it("should return 401 when header is missing", () => {
    requireStellarAddress(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.type).toBe(ErrorType.AUTH);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.message).toContain("Missing required header");
  });

  it("should return 401 when header is empty string", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = "";

    requireStellarAddress(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.type).toBe(ErrorType.AUTH);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("should return 401 when header is non-string array", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = [VALID_STELLAR_ADDRESS] as unknown as string;

    requireStellarAddress(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.type).toBe(ErrorType.AUTH);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("should return validation error when address format is invalid", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = INVALID_ADDRESS;

    requireStellarAddress(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toContain("Invalid Stellar address");
  });

  it("should return validation error when address starts with wrong prefix", () => {
    req.headers[STELLAR_ADDRESS_HEADER] = "XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

    requireStellarAddress(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});

describe("requireProjectAccess", () => {
  let req: Request;
  let res: Response;
  let next: MockNext;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should call next when projectId param is missing", async () => {
    res.locals.requesterAddress = VALID_STELLAR_ADDRESS;
    req.params = {};

    const middleware = requireProjectAccess(async () => null);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should call next when project does not exist (resolveProject returns null)", async () => {
    res.locals.requesterAddress = VALID_STELLAR_ADDRESS;
    req.params = { projectId: "non-existent-project" };

    const resolveProject = vi.fn().mockResolvedValue(null);
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    expect(resolveProject).toHaveBeenCalledWith("non-existent-project");
    expect(next).toHaveBeenCalledWith();
  });

  it("should allow access when requester is the project owner", async () => {
    res.locals.requesterAddress = VALID_STELLAR_ADDRESS;
    req.params = { projectId: "proj-1" };

    const resolveProject = vi.fn().mockResolvedValue({
      owner: VALID_STELLAR_ADDRESS,
      collaborators: [],
    });
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should allow access when requester is a collaborator", async () => {
    res.locals.requesterAddress = ANOTHER_VALID_ADDRESS;
    req.params = { projectId: "proj-2" };

    const resolveProject = vi.fn().mockResolvedValue({
      owner: VALID_STELLAR_ADDRESS,
      collaborators: [ANOTHER_VALID_ADDRESS, "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"],
    });
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should deny access when requester is neither owner nor collaborator", async () => {
    res.locals.requesterAddress = ANOTHER_VALID_ADDRESS;
    req.params = { projectId: "proj-3" };

    const resolveProject = vi.fn().mockResolvedValue({
      owner: VALID_STELLAR_ADDRESS,
      collaborators: ["GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"],
    });
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.type).toBe(ErrorType.AUTH);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.message).toBe("You are not authorized to access this project.");
  });

  it("should pass errors from resolveProject to next", async () => {
    res.locals.requesterAddress = VALID_STELLAR_ADDRESS;
    req.params = { projectId: "proj-4" };

    const dbError = new Error("Database connection failed");
    const resolveProject = vi.fn().mockRejectedValue(dbError);
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });

  it("should deny access when collaborators list is empty and requester is not owner", async () => {
    res.locals.requesterAddress = ANOTHER_VALID_ADDRESS;
    req.params = { projectId: "proj-5" };

    const resolveProject = vi.fn().mockResolvedValue({
      owner: VALID_STELLAR_ADDRESS,
      collaborators: [],
    });
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    const error = next.mock.calls[0][0] as AppError;
    expect(error.type).toBe(ErrorType.AUTH);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("should allow access when owner and collaborator lists contain the requester", async () => {
    res.locals.requesterAddress = VALID_STELLAR_ADDRESS;
    req.params = { projectId: "proj-6" };

    const resolveProject = vi.fn().mockResolvedValue({
      owner: VALID_STELLAR_ADDRESS,
      collaborators: [VALID_STELLAR_ADDRESS],
    });
    const middleware = requireProjectAccess(resolveProject);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

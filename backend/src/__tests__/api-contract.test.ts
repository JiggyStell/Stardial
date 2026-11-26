import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import SwaggerParser from "@apidevtools/swagger-parser";

/**
 * Issue #1461: API contract tests.
 *
 * These hit the real Express app and check the responses against the
 * generated OpenAPI document, so a route that starts returning an
 * undocumented shape (or a documented route that stops being served) fails
 * CI instead of surprising clients in production.
 */

vi.mock("@stellar/stellar-sdk", () => {
  return {
    Address: {
      fromString: vi.fn((address) => ({
        toScVal: () => ({ address }),
        toString: () => address,
      })),
    },
    BASE_FEE: "100",
    Contract: vi.fn().mockImplementation(function () {
      return { call: vi.fn((method: string, ...args: unknown[]) => ({ method, args })) };
    }),
    TransactionBuilder: vi.fn().mockImplementation(function () {
      return {
        op: undefined as unknown,
        addOperation: vi.fn(function (this: { op?: unknown }, op: unknown) {
          this.op = op;
          return this;
        }),
        setTimeout: vi.fn().mockReturnThis(),
        build: vi.fn(function (this: { op?: unknown }) {
          return { toXDR: () => "test_xdr", preparedOperation: this.op };
        }),
      };
    }),
    nativeToScVal: vi.fn((val) => ({ val })),
    scValToNative: vi.fn((val) => val),
    rpc: {
      Server: vi.fn().mockImplementation(function () {
        return {
          getAccount: vi.fn().mockResolvedValue({
            accountId: () => "GD5T6IPRNCKFOHQ3STZ5BTEYI5V6U5U6U5U6U5U6U5U6U5U6U5U6U5U6",
            sequenceNumber: () => "1",
            sequence: "1",
          }),
          simulateTransaction: vi.fn().mockResolvedValue({ result: { retval: [] } }),
          prepareTransaction: vi.fn().mockResolvedValue({
            toXDR: () => "test_xdr",
            sequence: "1",
            fee: "100",
          }),
        };
      }),
    },
    StrKey: {
      isValidEd25519PublicKey: vi.fn((v: string) => /^G[A-Z2-7]{55}$/.test(v)),
    },
    xdr: {
      ScVal: {
        scvU32: vi.fn((v) => v),
        scvVec: vi.fn((v) => v),
        scvMap: vi.fn((v) => v),
      },
      ScMapEntry: class {
        key: unknown;
        val: unknown;
        constructor({ key, val }: { key: unknown; val: unknown }) {
          this.key = key;
          this.val = val;
        }
      },
    },
  };
});

const MOCK_ON_CHAIN_PROJECT = {
  project_id: "afrobeats_001",
  title: "Afrobeats Collective Vol. 1",
  project_type: "music",
  owner: "GBJRKIYXAAFD3NZCWJXGUTNKYUQFZC2ANS6LRMBPJCE4IZSMJJMZPQBT",
  token: "CDOVDY3MZDG7PHCGVP7EP2EKQ2ENV26DZW6FKLBRN42LOGIZGXZV3WX5",
  locked: false,
  total_distributed: 0n,
  distribution_round: 0,
  collaborators: [
    {
      address: "GCZTK3PNYXCVF7Z3ELVELEJZ7BVGPGPVJ3NVZNI7O6DVCHPA4JU6LXRV",
      alias: "Producer",
      basis_points: 6000,
    },
    {
      address: "GBG234UA6RBPDD5K6FHMQXHUXB5ALOENQGH24Y3W4ERX2YJNQ4MK4V25",
      alias: "Vocalist",
      basis_points: 4000,
    },
  ],
};

vi.mock("../services/stellar.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/stellar.js")>();
  return {
    ...actual,
    loadStellarConfig: vi.fn(() => ({
      horizonUrl: "http://horizon",
      sorobanRpcUrl: "http://rpc",
      networkPassphrase: "Test SDF Network ; September 2015",
      contractId: "CAGR5U5IBEPFVJDZPZUXXNCPXAHNZ6TWVIUTI5RLRH3SZSU4O2VXDOPF",
      simulatorAccount: "GBJRKIYXAAFD3NZCWJXGUTNKYUQFZC2ANS6LRMBPJCE4IZSMJJMZPQBT",
    })),
    getStellarRpcServer: vi.fn(() => ({
      getAccount: vi.fn().mockResolvedValue({
        accountId: () => "GBJRKIYXAAFD3NZCWJXGUTNKYUQFZC2ANS6LRMBPJCE4IZSMJJMZPQBT",
        sequenceNumber: () => "1",
        incrementSequenceNumber: vi.fn(),
      }),
      simulateTransaction: vi.fn(async (tx?: { preparedOperation?: { method?: string } }) => {
        const method = tx?.preparedOperation?.method;
        switch (method) {
          case "project_exists":
          case "is_distributions_paused":
            return { result: { retval: false } };
          case "get_project":
            return { result: { retval: MOCK_ON_CHAIN_PROJECT } };
          case "list_projects":
            return { result: { retval: [MOCK_ON_CHAIN_PROJECT] } };
          case "get_project_count":
            return { result: { retval: 1 } };
          case "get_balance":
          case "get_unallocated_balance":
            return { result: { retval: 50_000_000n } };
          case "get_claimable":
            return {
              result: {
                retval: {
                  claimed: 3_000_000n,
                  distribution_round: 2,
                  last_claim_amount: 1_500_000n,
                },
              },
            };
          case "get_admin":
            return {
              result: {
                retval: "GBJRKIYXAAFD3NZCWJXGUTNKYUQFZC2ANS6LRMBPJCE4IZSMJJMZPQBT",
              },
            };
          case "get_allowed_token_count":
            return { result: { retval: 1 } };
          case "get_allowed_tokens":
            return {
              result: {
                retval: ["CDOVDY3MZDG7PHCGVP7EP2EKQ2ENV26DZW6FKLBRN42LOGIZGXZV3WX5"],
              },
            };
          case "is_token_allowed":
            return { result: { retval: true } };
          default:
            return { result: { retval: null } };
        }
      }),
      prepareTransaction: vi.fn().mockResolvedValue({
        toXDR: () => "test_xdr",
        sequence: "1",
        fee: "100",
      }),
      getEvents: vi.fn().mockResolvedValue({ events: [] }),
    })),
    executeWithRetry: vi.fn(async (fn) => fn()),
    getCached: vi.fn(() => undefined),
    setCached: vi.fn(),
    invalidateCache: vi.fn(),
    invalidateCacheByPrefix: vi.fn(),
    getCacheStats: vi.fn(() => ({ size: 0, keys: [], hits: 0, misses: 0, evictions: 0 })),
    READ_CACHE_TTL_MS: 30000,
    checkSorobanReachability: vi.fn().mockResolvedValue({
      rpc: { ok: true },
      contract: { ok: true },
    }),
  };
});

vi.mock("../services/database.js", () => ({
  getDataSource: vi.fn(() => ({
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ one: 1 }]),
    getRepository: vi.fn(() => ({
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      create: vi.fn((entity: unknown) => entity),
      save: vi.fn(async (entity: Record<string, unknown>) => ({
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-04-28T12:00:00.000Z"),
        updatedAt: new Date("2026-04-28T12:00:00.000Z"),
        ...entity,
      })),
      createQueryBuilder: vi.fn(() => ({
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        getCount: vi.fn().mockResolvedValue(0),
      })),
    })),
  })),
  withTransaction: vi.fn(async (cb: (qr: unknown) => Promise<unknown>) =>
    cb({
      manager: {
        getRepository: () => ({
          findOne: vi.fn().mockResolvedValue(null),
          create: vi.fn((entity: unknown) => entity),
          save: vi.fn(async (entity: Record<string, unknown>) => ({
            id: "11111111-1111-4111-8111-111111111111",
            createdAt: new Date("2026-04-28T12:00:00.000Z"),
            updatedAt: new Date("2026-04-28T12:00:00.000Z"),
            ...entity,
          })),
        }),
      },
    }),
  ),
  initDatabase: vi.fn().mockResolvedValue({}),
  closeDatabase: vi.fn().mockResolvedValue({}),
}));

import { app } from "../index.js";
import { generateOpenApi } from "../openapi.js";
import { clearEnvCache } from "../config/env.js";
import { markStartupComplete } from "../routes/health.js";

type JsonSchema = {
  $ref?: string;
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
};

type MediaTypeObject = {
  schema?: JsonSchema;
  example?: Record<string, unknown>;
};

type OperationObject = {
  requestBody?: { content?: Record<string, MediaTypeObject> };
  responses?: Record<string, { content?: Record<string, MediaTypeObject> }>;
};

type Spec = {
  paths?: Record<string, Record<string, OperationObject>>;
  components?: { schemas?: Record<string, JsonSchema> };
};

function cloneSpec(spec: unknown): Spec {
  return JSON.parse(JSON.stringify(spec)) as Spec;
}

/**
 * Fields the runtime emits today that the published schema does not yet
 * enumerate. They are documented in prose (see docs/runbooks) but deliberately
 * tolerated here so the test flags *new* accidental drift, not known gaps.
 */
const KNOWN_ADDITIVE_FIELDS = new Set(["code", "version"]);

function resolveSchema(spec: Spec, schema?: JsonSchema): JsonSchema | undefined {
  if (!schema) return undefined;
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop() as string;
    return spec.components?.schemas?.[name];
  }
  return schema;
}

function documentedSchema(
  spec: Spec,
  path: string,
  method: string,
  status: string,
): JsonSchema | undefined {
  const operation = spec.paths?.[path]?.[method];
  return resolveSchema(spec, operation?.responses?.[status]?.content?.["application/json"]?.schema);
}

function documentedTopLevelKeys(
  spec: Spec,
  path: string,
  method: string,
  status: string,
): Set<string> {
  const schema = documentedSchema(spec, path, method, status);
  return new Set(Object.keys(schema?.properties ?? {}));
}

beforeAll(() => {
  process.env.DATABASE_URL = "https://example.com/postgres";
  process.env.SIMULATOR_ACCOUNT = "GD5T6IPRNCKFOHQ3STZ5BTEYI5V6U5U6U5U6U5U6U5U6U5U6U5U6U5U6";
  process.env.CONTRACT_ID = "CBLASIRZ7CUKC7S5IS3VSNMQGKZ5FTRWLHZZXH7H4YG6ZLRFPJF5H2LR";
  process.env.HORIZON_URL = "https://horizon-testnet.stellar.org";
  process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
  process.env.SOROBAN_NETWORK_PASSPHRASE = "test";
});

beforeEach(() => {
  clearEnvCache();
  markStartupComplete();
});

describe("Issue #1461: API contract against generated OpenAPI", () => {
  it("generates a valid OpenAPI 3.0 document", async () => {
    await expect(SwaggerParser.validate(cloneSpec(generateOpenApi()) as never)).resolves.toBeDefined();
  });

  it("documents the operations the API is expected to serve", () => {
    const spec = generateOpenApi() as unknown as Spec;
    const expected: Array<[string, string]> = [
      ["get", "/splits"],
      ["post", "/splits"],
      ["get", "/splits/{projectId}"],
      ["post", "/splits/{projectId}/lock"],
      ["post", "/splits/{projectId}/deposit"],
      ["patch", "/splits/{projectId}/metadata"],
      ["patch", "/splits/{projectId}/expiration"],
      ["put", "/splits/{projectId}/collaborators"],
      ["post", "/splits/{projectId}/distribute"],
      ["get", "/splits/{projectId}/claimable/{address}"],
      ["post", "/splits/{projectId}/claim"],
      ["get", "/splits/{projectId}/history"],
      ["post", "/users/register"],
      ["post", "/users/login"],
      ["get", "/users/me"],
      ["patch", "/users/me"],
      ["delete", "/users/me"],
      ["get", "/transactions/history"],
      ["get", "/events"],
      ["get", "/health"],
      ["get", "/health/live"],
      ["get", "/health/startup"],
      ["get", "/health/ready"],
      ["get", "/ops/status"],
      ["post", "/ops/backfill"],
      ["get", "/ops/mainnet-readiness"],
    ];

    for (const [method, path] of expected) {
      expect(spec.paths?.[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });

  it("serves /api/openapi.json exactly matching the generated document", async () => {
    const spec = cloneSpec(generateOpenApi());
    const res = await request(app).get("/api/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(spec);
  });

  it("every documented operation declares at least one success response", () => {
    const spec = generateOpenApi() as unknown as Spec;

    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      for (const [method, operation] of Object.entries(pathItem)) {
        const statuses = Object.keys(operation.responses ?? {});
        expect(
          statuses.some((status) => status.startsWith("2")),
          `${method.toUpperCase()} ${path} has no 2xx response`,
        ).toBe(true);
      }
    }
  });

  describe("runtime responses stay inside the documented shape", () => {
    const contracts: Array<{
      method: "get";
      path: string;
      requestPath: string;
      status: string;
      required: string[];
    }> = [
      {
        method: "get",
        path: "/",
        requestPath: "/",
        status: "200",
        required: ["name", "status", "version"],
      },
      {
        method: "get",
        path: "/health/live",
        requestPath: "/health/live",
        status: "200",
        required: ["status"],
      },
      {
        method: "get",
        path: "/health/ready",
        requestPath: "/health/ready",
        status: "200",
        required: ["status", "components"],
      },
      {
        method: "get",
        path: "/health/startup",
        requestPath: "/health/startup",
        status: "200",
        required: ["status"],
      },
      {
        method: "get",
        path: "/splits",
        requestPath: "/splits",
        status: "200",
        required: ["projects", "total", "start", "limit", "hasMore", "nextCursor"],
      },
      {
        method: "get",
        path: "/splits/{projectId}",
        requestPath: "/splits/afrobeats_001",
        status: "200",
        required: [
          "projectId",
          "title",
          "projectType",
          "owner",
          "token",
          "locked",
          "totalDistributed",
          "distributionRound",
          "balance",
          "expiresAt",
          "collaborators",
          "participantPaymentStatuses",
        ],
      },
      {
        method: "get",
        path: "/splits/{projectId}/claimable/{address}",
        requestPath:
          "/splits/afrobeats_001/claimable/GCZTK3PNYXCVF7Z3ELVELEJZ7BVGPGPVJ3NVZNI7O6DVCHPA4JU6LXRV",
        status: "200",
        required: ["projectId", "address", "claimable"],
      },
      {
        method: "get",
        path: "/splits/{projectId}/history",
        requestPath: "/splits/afrobeats_001/history",
        status: "200",
        required: ["items", "nextCursor"],
      },
    ];

    for (const contract of contracts) {
      it(`GET ${contract.requestPath} matches its documented schema`, async () => {
        const spec = generateOpenApi() as unknown as Spec;
        const res = await request(app).get(contract.requestPath);

        expect(res.status).toBe(Number(contract.status));

        for (const key of contract.required) {
          expect(res.body).toHaveProperty(key);
        }

        const documented = documentedTopLevelKeys(spec, contract.path, contract.method, contract.status);
        expect(documented.size).toBeGreaterThan(0);

        for (const key of Object.keys(res.body)) {
          const allowed = documented.has(key) || KNOWN_ADDITIVE_FIELDS.has(key);
          expect(allowed, `GET ${contract.requestPath} returned undocumented field "${key}"`).toBe(true);
        }
      });
    }
  });

  describe("generated OpenAPI examples match schemas and live endpoints", () => {
    it("every documented request and 2xx response example satisfies its OpenAPI schema", () => {
      const spec = generateOpenApi() as unknown as Spec;

      for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
        for (const [method, operation] of Object.entries(pathItem)) {
          const reqMedia = operation.requestBody?.content?.["application/json"];
          const reqSchema = resolveSchema(spec, reqMedia?.schema);
          if (reqMedia?.example && reqSchema?.properties) {
            for (const reqKey of reqSchema.required ?? []) {
              expect(
                reqMedia.example,
                `${method.toUpperCase()} ${path} request example is missing required field "${reqKey}"`,
              ).toHaveProperty(reqKey);
            }
            if (reqSchema.additionalProperties === false) {
              for (const key of Object.keys(reqMedia.example)) {
                expect(
                  Object.prototype.hasOwnProperty.call(reqSchema.properties, key),
                  `${method.toUpperCase()} ${path} request example has undeclared field "${key}"`,
                ).toBe(true);
              }
            }
          }

          for (const [status, responseObj] of Object.entries(operation.responses ?? {})) {
            if (!status.startsWith("2")) continue;
            const resMedia = responseObj.content?.["application/json"];
            const resSchema = resolveSchema(spec, resMedia?.schema);
            if (resMedia?.example && resSchema?.properties) {
              for (const reqKey of resSchema.required ?? []) {
                expect(
                  resMedia.example,
                  `${method.toUpperCase()} ${path} ${status} example is missing required field "${reqKey}"`,
                ).toHaveProperty(reqKey);
              }
              for (const key of Object.keys(resMedia.example)) {
                expect(
                  Object.prototype.hasOwnProperty.call(resSchema.properties, key),
                  `${method.toUpperCase()} ${path} ${status} example has undeclared field "${key}"`,
                ).toBe(true);
              }
            }
          }
        }
      }
    });

    const liveExampleMutations: Array<{
      method: "post" | "put" | "patch";
      specPath: string;
      requestPath: string;
      expectedStatus: number;
    }> = [
      {
        method: "post",
        specPath: "/splits",
        requestPath: "/splits",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/{projectId}/lock",
        requestPath: "/splits/afrobeats_001/lock",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/{projectId}/deposit",
        requestPath: "/splits/afrobeats_001/deposit",
        expectedStatus: 200,
      },
      {
        method: "patch",
        specPath: "/splits/{projectId}/metadata",
        requestPath: "/splits/afrobeats_001/metadata",
        expectedStatus: 200,
      },
      {
        method: "put",
        specPath: "/splits/{projectId}/collaborators",
        requestPath: "/splits/afrobeats_001/collaborators",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/{projectId}/distribute",
        requestPath: "/splits/afrobeats_001/distribute",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/{projectId}/claim",
        requestPath: "/splits/afrobeats_001/claim",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/users/register",
        requestPath: "/users/register",
        expectedStatus: 201,
      },
      {
        method: "post",
        specPath: "/splits/admin/allow-token",
        requestPath: "/splits/admin/allow-token",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/admin/disallow-token",
        requestPath: "/splits/admin/disallow-token",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/admin/pause-distributions",
        requestPath: "/splits/admin/pause-distributions",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/admin/unpause-distributions",
        requestPath: "/splits/admin/unpause-distributions",
        expectedStatus: 200,
      },
      {
        method: "post",
        specPath: "/splits/admin/withdraw-unallocated",
        requestPath: "/splits/admin/withdraw-unallocated",
        expectedStatus: 200,
      },
    ];

    for (const item of liveExampleMutations) {
      it(`${item.method.toUpperCase()} ${item.specPath} accepts its generated OpenAPI request example and returns the documented response shape`, async () => {
        const spec = generateOpenApi() as unknown as Spec;
        const operation = spec.paths?.[item.specPath]?.[item.method];
        const examplePayload = operation?.requestBody?.content?.["application/json"]?.example;
        expect(examplePayload, `Missing request example for ${item.method.toUpperCase()} ${item.specPath}`).toBeDefined();

        const res = await request(app)[item.method](item.requestPath).send(examplePayload);
        expect(res.status, JSON.stringify(res.body)).toBe(item.expectedStatus);

        const statusKey = String(item.expectedStatus);
        const resSchema = documentedSchema(spec, item.specPath, item.method, statusKey);
        expect(resSchema).toBeDefined();

        for (const reqKey of resSchema?.required ?? []) {
          expect(res.body).toHaveProperty(reqKey);
        }

        const documented = documentedTopLevelKeys(spec, item.specPath, item.method, statusKey);
        for (const key of Object.keys(res.body)) {
          expect(
            documented.has(key),
            `${item.method.toUpperCase()} ${item.requestPath} returned undocumented field "${key}"`,
          ).toBe(true);
        }
      });
    }
  });

  it("serves the stable unknown-route 404 contract", async () => {
    const spec = generateOpenApi() as unknown as Spec;
    const res = await request(app).get("/this/route/is/not/documented");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "not_found",
      code: "NOT_FOUND",
      message: "The requested resource does not exist.",
      requestId: expect.any(String),
      details: {},
    });

    const errorSchema = resolveSchema(spec, spec.components?.schemas?.ApiError);
    const bodyKeys = Object.keys(res.body);
    for (const key of bodyKeys) {
      const allowed =
        Object.prototype.hasOwnProperty.call(errorSchema?.properties ?? {}, key) ||
        KNOWN_ADDITIVE_FIELDS.has(key);
      expect(allowed, `unknown-route body returned undocumented field "${key}"`).toBe(true);
    }
  });

  it("returns a documented error envelope for an invalid request", async () => {
    const res = await request(app).get("/splits/invalid-project-id!!!");

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).toBe("validation_error");
    expect(res.body.requestId).toBeTruthy();

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("stack");
    expect(serialized).not.toContain("at Object.");
  });

  it("rejects unsupported verbs on mutation resources without dispatching a mutation", async () => {
    const unsupported = [
      ["put", "/splits"],
      ["patch", "/splits"],
      ["delete", "/splits"],
      ["put", "/users/me"],
      ["post", "/transactions/history"],
    ] as const;

    for (const [method, path] of unsupported) {
      const res = await request(app)[method](path).send({ name: "must not be created" });
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(404);
      expect(res.body).toMatchObject({
        error: "not_found",
        code: "NOT_FOUND",
        message: "The requested resource does not exist.",
      });
      expect(JSON.stringify(res.body)).not.toContain("must not be created");
    }
  });

  it("keeps HEAD as the GET equivalent and OPTIONS as CORS preflight", async () => {
    const head = await request(app).head("/health/live");
    expect(head.status).toBe(200);
    expect(head.text ?? "").toBe("");

    const options = await request(app).options("/splits");
    expect(options.status).toBe(204);
    expect(options.headers["access-control-allow-methods"]).toBeTruthy();
  });
});

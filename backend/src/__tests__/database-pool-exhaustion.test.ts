import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataSource } from "typeorm";
import { clearEnvCache } from "../config/env.js";
import { closeDatabase, initDatabase, withTransaction } from "../services/database.js";

const testEnv = {
  DATABASE_URL: "postgres://test:test@localhost:5432/stardial_test",
  HORIZON_URL: "https://horizon-testnet.stellar.org",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  SOROBAN_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  SIMULATOR_ACCOUNT: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  NODE_ENV: "test",
};

function applyTestEnv(): void {
  for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] = value;
  }
}

function clearTestEnv(): void {
  for (const key of Object.keys(testEnv)) {
    delete process.env[key];
  }
}

describe("database connection pool exhaustion", () => {
  beforeEach(async () => {
    applyTestEnv();
    clearEnvCache();
    await closeDatabase();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.restoreAllMocks();
    clearEnvCache();
    clearTestEnv();
  });

  it("rejects connections when pool is exhausted", async () => {
    let connectionCount = 0;
    const MAX_POOL = 2;

    vi.spyOn(DataSource.prototype, "initialize").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = true;
        return this;
      }
    );
    vi.spyOn(DataSource.prototype, "destroy").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = false;
      }
    );
    vi.spyOn(DataSource.prototype, "createQueryRunner").mockImplementation(
      () => ({
        connect: vi.fn().mockImplementation(async () => {
          connectionCount++;
          if (connectionCount > MAX_POOL) {
            throw new Error("Connection pool exhausted");
          }
        }),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn().mockImplementation(() => {
          connectionCount = Math.max(0, connectionCount - 1);
        }),
        manager: {},
      }) as unknown as ReturnType<DataSource["createQueryRunner"]>
    );

    await initDatabase();

    const results = await Promise.allSettled([
      withTransaction(async () => "ok1"),
      withTransaction(async () => "ok2"),
      withTransaction(async () => "ok3"),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded.length).toBeLessThanOrEqual(MAX_POOL);
    expect(failed.length).toBeGreaterThanOrEqual(1);

    for (const f of failed) {
      expect((f as PromiseRejectedResult).reason.message).toContain(
        "Connection pool exhausted"
      );
    }
  });

  it("retries on deadlock and eventually succeeds", async () => {

    vi.spyOn(DataSource.prototype, "initialize").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = true;
        return this;
      }
    );
    vi.spyOn(DataSource.prototype, "destroy").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = false;
      }
    );
    vi.spyOn(DataSource.prototype, "createQueryRunner").mockImplementation(
      () => ({
        connect: vi.fn(),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn(),
        manager: {},
      }) as unknown as ReturnType<DataSource["createQueryRunner"]>
    );

    await initDatabase();

    let attempt = 0;
    const callback = vi.fn().mockImplementation(async () => {
      attempt++;
      if (attempt < 3) {
        const err = new Error("deadlock detected") as Error & { code: string };
        err.code = "40P01";
        throw err;
      }
      return "recovered";
    });

    const result = await withTransaction(callback);
    expect(result).toBe("recovered");
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("gives up after max deadlock retries", async () => {
    vi.spyOn(DataSource.prototype, "initialize").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = true;
        return this;
      }
    );
    vi.spyOn(DataSource.prototype, "destroy").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = false;
      }
    );
    vi.spyOn(DataSource.prototype, "createQueryRunner").mockImplementation(
      () => ({
        connect: vi.fn(),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn(),
        manager: {},
      }) as unknown as ReturnType<DataSource["createQueryRunner"]>
    );

    await initDatabase();

    const callback = vi.fn().mockImplementation(async () => {
      const err = new Error("deadlock detected") as Error & { code: string };
      err.code = "40P01";
      throw err;
    });

    await expect(withTransaction(callback)).rejects.toThrow(
      "deadlock detected"
    );
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("releases connections after successful transaction", async () => {
    let activeConnections = 0;
    let maxObserved = 0;

    vi.spyOn(DataSource.prototype, "initialize").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = true;
        return this;
      }
    );
    vi.spyOn(DataSource.prototype, "destroy").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = false;
      }
    );
    vi.spyOn(DataSource.prototype, "createQueryRunner").mockImplementation(
      () => ({
        connect: vi.fn().mockImplementation(async () => {
          activeConnections++;
          maxObserved = Math.max(maxObserved, activeConnections);
        }),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn().mockImplementation(() => {
          activeConnections--;
        }),
        manager: {},
      }) as unknown as ReturnType<DataSource["createQueryRunner"]>
    );

    await initDatabase();

    await withTransaction(async () => "ok1");
    await withTransaction(async () => "ok2");
    await withTransaction(async () => "ok3");

    expect(activeConnections).toBe(0);
    expect(maxObserved).toBe(1);
  });

  it("rolls back non-deadlock errors without retry", async () => {

    vi.spyOn(DataSource.prototype, "initialize").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = true;
        return this;
      }
    );
    vi.spyOn(DataSource.prototype, "destroy").mockImplementation(
      async function (this: DataSource) {
        this.isInitialized = false;
      }
    );
    vi.spyOn(DataSource.prototype, "createQueryRunner").mockImplementation(
      () => ({
        connect: vi.fn(),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn(),
        manager: {},
      }) as unknown as ReturnType<DataSource["createQueryRunner"]>
    );

    await initDatabase();

    const callback = vi.fn().mockImplementation(async () => {
      throw new Error("Unique constraint violation");
    });

    await expect(withTransaction(callback)).rejects.toThrow(
      "Unique constraint violation"
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

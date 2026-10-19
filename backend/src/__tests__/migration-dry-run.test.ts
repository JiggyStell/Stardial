import { describe, expect, it } from "vitest";
import { resolveMigrationConfig } from "../../scripts/run-migration-dry-run.mjs";

describe("resolveMigrationConfig", () => {
  it("prefers isolated migration env vars over the general DATABASE_URL", () => {
    const config = resolveMigrationConfig({
      DATABASE_URL: "postgresql://prod:prod@prod.example.com:5432/production",
      MIGRATION_DRY_RUN_DATABASE_URL: "postgresql://ci:ci@localhost:5432/stardial_ci",
      MIGRATION_DRY_RUN_DATABASE_NAME: "stardial_ci",
      MIGRATION_DRY_RUN_ADMIN_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres",
    });

    expect(config.databaseUrl).toBe("postgresql://ci:ci@localhost:5432/stardial_ci");
    expect(config.adminConnectionString).toBe("postgresql://postgres:postgres@localhost:5432/postgres");
    expect(config.databaseName).toBe("stardial_ci");
  });

  it("does not use the general DATABASE_URL when no dry-run target is configured", () => {
    const config = resolveMigrationConfig({
      DATABASE_URL: "postgresql://prod:prod@prod.example.com:5432/production",
    });

    expect(config.databaseUrl).toBe(
      "postgresql://stardial:stardial@localhost:5432/stardial_ci",
    );
    expect(config.databaseName).toBe("stardial_ci");
  });

  it("rejects a target name that does not match the isolated URL", () => {
    expect(() =>
      resolveMigrationConfig({
        MIGRATION_DRY_RUN_DATABASE_URL: "postgresql://ci:ci@localhost:5432/stardial_ci",
        MIGRATION_DRY_RUN_DATABASE_NAME: "another_database",
      }),
    ).toThrow("MIGRATION_DRY_RUN_DATABASE_NAME must match");
  });

  it("rejects a PostgreSQL system database as the dry-run target", () => {
    expect(() =>
      resolveMigrationConfig({
        MIGRATION_DRY_RUN_DATABASE_URL: "postgresql://ci:ci@localhost:5432/postgres",
      }),
    ).toThrow("must target a dedicated database");
  });
});

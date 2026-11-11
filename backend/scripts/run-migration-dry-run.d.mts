/**
 * Type declarations for the untyped `.mjs` dry-run helper.
 *
 * `src/__tests__/migration-dry-run.test.ts` imports `resolveMigrationConfig`
 * from this script; without these declarations the import is an implicit
 * `any` (TS7016) and the test file cannot typecheck.
 */

export interface MigrationDryRunConfig {
  /** Isolated database URL the dry run migrates. */
  databaseUrl: string;
  /** Database name parsed from `databaseUrl`. */
  databaseName: string;
  /** Connection string used only to create/drop the isolated database. */
  adminConnectionString: string;
}

export function resolveMigrationConfig(
  environment?: Record<string, string | undefined>,
): MigrationDryRunConfig;

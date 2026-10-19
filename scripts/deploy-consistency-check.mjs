#!/usr/bin/env node

/**
 * deploy-consistency-check.mjs
 *
 * Validates that frontend and backend deployment configuration values are
 * consistent for a target environment (testnet or mainnet). Checks that
 * contract IDs, Stellar network passphrases, Horizon URLs, and Soroban RPC
 * URLs are aligned across both services.
 *
 * Usage:
 *   node scripts/deploy-consistency-check.mjs [testnet|mainnet]
 *
 * Related: GitHub Issue #842
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// ─── Stellar network identifiers ──────────────────────────────────────────

const NETWORK_CONFIG = {
  testnet: {
    passphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  },
  mainnet: {
    passphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-mainnet.stellar.org",
  },
};

// ─── Env file parser ──────────────────────────────────────────────────────

/**
 * Parses a .env-style file and returns a key-value map.
 * Skips comments, blank lines, and `[TEMPLATE]` markers.
 */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, "utf-8");
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed === "[TEMPLATE]") continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Tries env file first, then falls back to process.env for each key.
 */
function resolveEnv(key, envFile) {
  if (envFile && envFile[key] !== undefined && envFile[key] !== "") {
    return envFile[key];
  }
  return process.env[key] ?? "";
}

// ─── Validation helpers ───────────────────────────────────────────────────

function red(str) {
  return `\x1b[31m${str}\x1b[0m`;
}
function green(str) {
  return `\x1b[32m${str}\x1b[0m`;
}
function yellow(str) {
  return `\x1b[33m${str}\x1b[0m`;
}
function bold(str) {
  return `\x1b[1m${str}\x1b[0m`;
}

const errors = [];
const warnings = [];

function addError(msg) {
  errors.push(msg);
}
function addWarning(msg) {
  warnings.push(msg);
}

function checkContractId(network, feContractId, beContractId) {
  if (!feContractId && !beContractId) {
    addWarning(
      `Contract ID is not configured in frontend or backend. ` +
        `Set NEXT_PUBLIC_CONTRACT_ID and CONTRACT_ID.`
    );
    return;
  }
  if (!feContractId) {
    addError(
      `Frontend NEXT_PUBLIC_CONTRACT_ID is empty but backend CONTRACT_ID is set to "${beContractId}".`
    );
    return;
  }
  if (!beContractId) {
    addError(
      `Backend CONTRACT_ID is empty but frontend NEXT_PUBLIC_CONTRACT_ID is set to "${feContractId}".`
    );
    return;
  }
  if (feContractId !== beContractId) {
    addError(
      `Contract ID mismatch:\n` +
        `  Frontend NEXT_PUBLIC_CONTRACT_ID = "${feContractId}"\n` +
        `  Backend CONTRACT_ID             = "${beContractId}"`
    );
    return;
  }
  // Validate format
  const contractIdRegex = /^C[A-Z2-7]{55}$/;
  if (!contractIdRegex.test(feContractId)) {
    addWarning(
      `Contract ID "${feContractId}" does not match the expected Stellar contract address format (C + 55 alphanumeric chars).`
    );
  }
}

function checkNetworkPassphrase(network, feNetwork, bePassphrase) {
  const expected = NETWORK_CONFIG[network];

  // Check frontend network
  if (feNetwork && feNetwork !== network) {
    addError(
      `Frontend network "${feNetwork}" does not match target "${network}". ` +
        `Set NEXT_PUBLIC_STELLAR_NETWORK=${network} in frontend/.env.`
    );
  } else if (!feNetwork) {
    addWarning(
      `Frontend NEXT_PUBLIC_STELLAR_NETWORK is not set; it defaults to "testnet". ` +
        `If targeting ${network}, explicitly set it.`
    );
  }

  // Check backend passphrase
  if (bePassphrase && bePassphrase !== expected.passphrase) {
    addError(
      `Backend SOROBAN_NETWORK_PASSPHRASE does not match ${network}:\n` +
        `  Expected: "${expected.passphrase}"\n` +
        `  Got:      "${bePassphrase}"`
    );
  } else if (!bePassphrase) {
    addError(
      `Backend SOROBAN_NETWORK_PASSPHRASE is not set. ` +
        `For ${network}, set it to "${expected.passphrase}".`
    );
  }
}

function checkUrl(service, key, value, expected, allowCustom = true) {
  if (!value) {
    addWarning(`${service} ${key} is not set.`);
    return;
  }
  // Check scheme
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    addError(`${service} ${key}="${value}" must use http:// or https:// scheme.`);
    return;
  }
  // For mainnet, warn if using a non-standard URL
  if (expected && value !== expected && !allowCustom) {
    addError(
      `${service} ${key} should be "${expected}" for this environment, but got "${value}".`
    );
  }
}

function checkHorizonConsistency(network, feHorizonUrl, beHorizonUrl) {
  const expected = NETWORK_CONFIG[network].horizonUrl;
  checkUrl("Frontend", "NEXT_PUBLIC_HORIZON_URL", feHorizonUrl, expected);
  checkUrl("Backend", "HORIZON_URL", beHorizonUrl, expected);
  // Check consistency
  if (feHorizonUrl && beHorizonUrl && feHorizonUrl !== beHorizonUrl) {
    addWarning(
      `Horizon URL mismatch:\n` +
        `  Frontend NEXT_PUBLIC_HORIZON_URL = "${feHorizonUrl}"\n` +
        `  Backend HORIZON_URL              = "${beHorizonUrl}"\n` +
        `  These typically should match for the same ${network} environment.`
    );
  }
}

function checkRpcConsistency(network, feRpcUrl, beRpcUrl) {
  const expected = NETWORK_CONFIG[network].sorobanRpcUrl;
  checkUrl("Frontend", "NEXT_PUBLIC_SOROBAN_RPC_URL", feRpcUrl, expected);
  checkUrl("Backend", "SOROBAN_RPC_URL", beRpcUrl, expected);
  if (feRpcUrl && beRpcUrl && feRpcUrl !== beRpcUrl) {
    addWarning(
      `Soroban RPC URL mismatch:\n` +
        `  Frontend NEXT_PUBLIC_SOROBAN_RPC_URL = "${feRpcUrl}"\n` +
        `  Backend SOROBAN_RPC_URL              = "${beRpcUrl}"\n` +
        `  These typically should match for the same ${network} environment.`
    );
  }
}

function checkApiBaseUrl(feApiBaseUrl) {
  if (!feApiBaseUrl) {
    addError(
      "Frontend NEXT_PUBLIC_API_BASE_URL is not set. " +
        "The frontend needs to know where the backend API lives."
    );
    return;
  }
  if (!feApiBaseUrl.startsWith("http://") && !feApiBaseUrl.startsWith("https://")) {
    addError(
      `Frontend NEXT_PUBLIC_API_BASE_URL="${feApiBaseUrl}" must use http:// or https:// scheme.`
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const target = (process.argv[2] ?? "").toLowerCase().trim();

  if (!target || !NETWORK_CONFIG[target]) {
    console.error(`${red("Error:")} Target environment is required.`);
    console.error(`  Usage: node deploy-consistency-check.mjs [testnet|mainnet]`);
    console.error(`  Supported targets: ${Object.keys(NETWORK_CONFIG).join(", ")}`);
    process.exit(1);
  }

  const network = target;
  console.log(bold(`\nStardial deploy consistency check — ${network.toUpperCase()}\n`));

  // Resolve env files
  const frontendEnvPath = resolve(PROJECT_ROOT, "frontend", ".env");
  const backendEnvPath = resolve(PROJECT_ROOT, "backend", ".env");
  const feEnvFile = parseEnvFile(frontendEnvPath);
  const beEnvFile = parseEnvFile(backendEnvPath);

  console.log(`  Frontend env: ${feEnvFile ? green("found") : yellow("not found (using process.env)")}  (${frontendEnvPath})`);
  console.log(`  Backend env:  ${beEnvFile ? green("found") : yellow("not found (using process.env)")}  (${backendEnvPath})`);
  console.log();

  // Gather values
  const feContractId = resolveEnv("NEXT_PUBLIC_CONTRACT_ID", feEnvFile);
  const beContractId = resolveEnv("CONTRACT_ID", beEnvFile);
  const feNetwork = resolveEnv("NEXT_PUBLIC_STELLAR_NETWORK", feEnvFile);
  const feLegacyNetwork = resolveEnv("NEXT_PUBLIC_NETWORK", feEnvFile);
  const bePassphrase = resolveEnv("SOROBAN_NETWORK_PASSPHRASE", beEnvFile);
  const feHorizonUrl = resolveEnv("NEXT_PUBLIC_HORIZON_URL", feEnvFile);
  const beHorizonUrl = resolveEnv("HORIZON_URL", beEnvFile);
  const feRpcUrl = resolveEnv("NEXT_PUBLIC_SOROBAN_RPC_URL", feEnvFile);
  const beRpcUrl = resolveEnv("SOROBAN_RPC_URL", beEnvFile);
  const feApiBaseUrl = resolveEnv("NEXT_PUBLIC_API_BASE_URL", feEnvFile);

  // Legacy network check
  if (feLegacyNetwork) {
    addWarning(
      `NEXT_PUBLIC_NETWORK="${feLegacyNetwork}" is deprecated. ` +
        `Use NEXT_PUBLIC_STELLAR_NETWORK instead.`
    );
  }

  // Run all checks
  console.log(bold("Checks:"));
  console.log();

  checkContractId(network, feContractId, beContractId);
  checkNetworkPassphrase(network, feNetwork, bePassphrase);
  checkHorizonConsistency(network, feHorizonUrl, beHorizonUrl);
  checkRpcConsistency(network, feRpcUrl, beRpcUrl);
  checkApiBaseUrl(feApiBaseUrl);

  // Report results
  if (errors.length > 0) {
    console.log(red(bold(`${errors.length} error(s) found:`)));
    for (const err of errors) {
      console.log(`  ${red("✗")} ${err}`);
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log(yellow(bold(`${warnings.length} warning(s):`)));
    for (const warn of warnings) {
      console.log(`  ${yellow("⚠")} ${warn}`);
    }
    console.log();
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ${green("✓")} All deployment config values are consistent for ${network}.`);
    console.log();
    console.log(green(bold("PASS")));
    process.exit(0);
  } else if (errors.length === 0) {
    console.log(yellow(bold("PASS WITH WARNINGS — review above before deploying.")));
    process.exit(0);
  } else {
    console.log(red(bold("FAIL — fix the errors above before deploying to " + network + ".")));
    process.exit(1);
  }
}

main();

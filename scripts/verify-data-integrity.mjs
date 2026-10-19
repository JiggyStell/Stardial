#!/usr/bin/env node
/**
 * Verifies contract interface artifacts and generated TypeScript types are
 * committed in sync with contracts/*.rs sources.
 *
 * Usage: node scripts/verify-data-integrity.mjs
 * Exit 0 when clean; exit 1 with a diff summary when drift is detected.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function run(command) {
  execSync(command, { cwd: repoRoot, stdio: "inherit" });
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function verifyReadmeErrorCodes() {
  const errorsRs = read("contracts/errors.rs");
  const readme = read("contracts/README.md");
  const codes = [...errorsRs.matchAll(/^\s+(\w+)\s*=\s*(\d+),/gm)].map((m) => ({
    name: m[1],
    code: Number(m[2])
  }));

  const missing = codes.filter(({ name, code }) => {
    const linePattern = new RegExp("- `" + code + "` `" + name + "`");
    return !linePattern.test(readme);
  });

  if (missing.length > 0) {
    console.error(
      "[verify:data-integrity] contracts/README.md is missing error entries:",
      missing.map((e) => `${e.code} ${e.name}`).join(", ")
    );
    process.exit(1);
  }
}

function snapshot(paths) {
  return new Map(paths.map((path) => [path, read(path)]));
}

function verifyUnchanged(paths, before) {
  const changed = paths.filter((path) => read(path) !== before.get(path));
  if (changed.length === 0) return;

  console.error(
    "[verify:data-integrity] Generated artifacts are out of date. Run:\n" +
      "  npm run generate:contract-interface\n" +
      "  npm run generate:contract-types\n" +
      "Then commit the updated files."
  );
  try {
    execSync(`git diff -- ${changed.join(" ")}`, { cwd: repoRoot, stdio: "inherit" });
  } catch {
    /* ignore */
  }
  process.exit(1);
}

console.log("Stardial data integrity verification");
console.log("====================================");

verifyReadmeErrorCodes();
console.log("✓ contracts/README.md error table matches errors.rs");

const interfacePaths = ["contracts/interface/stardial.contract-interface.json"];
const interfaceBefore = snapshot(interfacePaths);
run("node contracts/scripts/generate-interface.mjs");
verifyUnchanged(interfacePaths, interfaceBefore);
console.log("✓ contract interface artifact is current");

const typePaths = [
  "backend/src/generated/contract-types.ts",
  "frontend/src/generated/contract-types.ts"
];
const typesBefore = snapshot(typePaths);
run("node scripts/generate-contract-types.mjs");
verifyUnchanged(typePaths, typesBefore);
console.log("✓ generated contract types match interface artifact");

console.log("\nAll data integrity checks passed.");

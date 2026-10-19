#!/usr/bin/env node
/**
 * Lightweight static analysis for the Stardial Soroban contract.
 * Reports public function count, error codes, and event types without
 * requiring a live Soroban node.
 *
 * Usage: node contracts/scripts/analyze-contract.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function count(src, re) {
  return (src.match(re) ?? []).length;
}

const lib    = read("lib.rs");
const errors = read("errors.rs");
const events = read("events.rs");

const fns      = count(lib,    /pub fn /g);
const errCodes = count(errors, /= \d+,/g);
const evTypes  = count(events, /pub struct /g);

console.log("Contract surface analysis");
console.log("--------------------------");
console.log(`Public functions : ${fns}`);
console.log(`Error codes      : ${errCodes}`);
console.log(`Event types      : ${evTypes}`);

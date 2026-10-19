#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const interfacePath = resolve(repoRoot, "contracts/interface/stardial.contract-interface.json");

const contractInterface = JSON.parse(readFileSync(interfacePath, "utf8"));
// Simple healthcheck script for deployment readiness verification
function mapSorobanTypeToTS(type) {
  const mappings = {
    Address: "string",
    String: "string",
    Symbol: "string",
    bool: "boolean",
    u32: "number",
    i128: "string",
    u64: "string",
    i64: "string"
  };

  if (type.startsWith("Vec<")) {
    const innerType = type.slice(4, -1);
    return `Array<${mapSorobanTypeToTS(innerType)}>`;
  }

  if (type.startsWith("Option<")) {
    const innerType = type.slice(7, -1);
    return `${mapSorobanTypeToTS(innerType)} | null`;
  }

  if (type.startsWith("Result<")) {
    const innerType = type.slice(7, -1).split(",")[0];
    return mapSorobanTypeToTS(innerType);
  }

  return mappings[type] || type;
}

function generateTSInterface(name, fields) {
  const fieldLines = fields
    .map(
      (field) =>
        `  /** ${field.doc} */\n  ${field.name}: ${mapSorobanTypeToTS(field.type)};`
    )
    .join("\n");

  return `export interface ${name} {\n${fieldLines}\n}`;
}

function generateZodSchema(name, fields) {
  const fieldLines = fields
    .map((field) => {
      const tsType = mapSorobanTypeToTS(field.type);
      let zodType = "z.string()";

      if (tsType === "boolean") zodType = "z.boolean()";
      else if (tsType === "number") zodType = "z.number()";
      else if (tsType.startsWith("Array<")) {
        const innerType = tsType.slice(6, -1);
        let innerZod = "z.string()";
        if (innerType === "boolean") innerZod = "z.boolean()";
        else if (innerType === "number") innerZod = "z.number()";
        zodType = `z.array(${innerZod})`;
      } else if (tsType.includes(" | null")) {
        const baseType = tsType.replace(" | null", "");
        let baseZod = "z.string()";
        if (baseType === "boolean") baseZod = "z.boolean()";
        else if (baseType === "number") baseZod = "z.number()";
        zodType = `${baseZod}.nullable()`;
      }

      return `  ${field.name}: ${zodType}.describe("${escapeDocString(field.doc)}")`;
    })
    .join(",\n");

  return `export const ${name}Schema = z.object({\n${fieldLines}\n});`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeDocString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function generateMethodArgs(name, args) {
  if (args.length === 0) return "";

  return `export type ${capitalize(name)}Args = {\n${args
    .map((arg) => `  ${arg.name}: ${mapSorobanTypeToTS(arg.type)};`)
    .join("\n")}\n};`;
}

let output = `// Auto-generated from contract interface artifact
// Do not edit manually - regenerate with: npm run generate:contract-types

import { z } from "zod";

// Contract Types
`;

for (const [name, typeDef] of Object.entries(contractInterface.types)) {
  if (typeDef.kind === "struct" && typeDef.fields) {
    output += `\n${generateTSInterface(name, typeDef.fields)}\n\n`;
    output += `${generateZodSchema(name, typeDef.fields)}\n\n`;
  }
}

output += "// Method Argument Types\n\n";
for (const method of contractInterface.methods) {
  if (method.args.length > 0) {
    output += `${generateMethodArgs(method.name, method.args)}\n\n`;
  }
}

output += "// Event Types\n\n";
for (const event of contractInterface.events) {
  const fieldLines = event.fields
    .map((field) => `  ${field.name}: ${mapSorobanTypeToTS(field.type)};`)
    .join("\n");

  output += `export interface ${capitalize(event.name)}Event {\n${fieldLines}\n}\n\n`;
}

output += "// Error Types\n\n";
output += "export const ContractErrors = {\n";
for (const error of contractInterface.errors) {
  output += `  ${error.name}: ${error.code},\n`;
}
output += "} as const;\n\n";

output += "export type ContractErrorCode = typeof ContractErrors[keyof typeof ContractErrors];\n";

const backendOutputPath = resolve(repoRoot, "backend/src/generated/contract-types.ts");
writeFileSync(backendOutputPath, output);
console.log(`Generated backend types: ${backendOutputPath}`);

let frontendOutput = `// Auto-generated from contract interface artifact
// Do not edit manually - regenerate with: npm run generate:contract-types

// Contract Types
`;

for (const [name, typeDef] of Object.entries(contractInterface.types)) {
  if (typeDef.kind === "struct" && typeDef.fields) {
    frontendOutput += `\n${generateTSInterface(name, typeDef.fields)}\n\n`;
  }
}

frontendOutput += "// Method Argument Types\n\n";
for (const method of contractInterface.methods) {
  if (method.args.length > 0) {
    frontendOutput += `${generateMethodArgs(method.name, method.args)}\n\n`;
  }
}

frontendOutput += "// Event Types\n\n";
for (const event of contractInterface.events) {
  const fieldLines = event.fields
    .map((field) => `  ${field.name}: ${mapSorobanTypeToTS(field.type)};`)
    .join("\n");

  frontendOutput += `export interface ${capitalize(event.name)}Event {\n${fieldLines}\n}\n\n`;
}

frontendOutput += "// Error Types\n\n";
frontendOutput += "export const ContractErrors = {\n";
for (const error of contractInterface.errors) {
  frontendOutput += `  ${error.name}: ${error.code},\n`;
}
frontendOutput += "} as const;\n\n";

frontendOutput +=
  "export type ContractErrorCode = typeof ContractErrors[keyof typeof ContractErrors];\n";

const frontendOutputPath = resolve(repoRoot, "frontend/src/generated/contract-types.ts");
writeFileSync(frontendOutputPath, frontendOutput);
console.log(`Generated frontend types: ${frontendOutputPath}`);

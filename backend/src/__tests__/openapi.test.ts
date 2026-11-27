import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as yaml from "yaml";
import { generateOpenApi } from "../openapi.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const committedSpecPath = join(__dirname, "..", "..", "..", "docs", "openapi.yaml");
const committedJsonPath = join(__dirname, "..", "..", "..", "docs", "openapi.json");

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc: Record<string, unknown>, key: string) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

describe("OpenAPI specification", () => {
  it("generates a valid OpenAPI document without $ref errors", async () => {
    const spec = generateOpenApi();

    for (const pathItem of Object.values(spec.paths ?? {})) {
      for (const operation of Object.values(pathItem ?? {})) {
        if (operation && typeof operation === "object" && "summary" in operation) {
          expect(operation.summary).toBeTruthy();
          expect(String(operation.summary).trim().length).toBeGreaterThan(0);
        }
      }
    }

    // generateOpenApi() is typed with openapi3-ts while swagger-parser expects
    // openapi-types; the two define structurally identical documents.
    await expect(
      SwaggerParser.validate(spec as unknown as Parameters<typeof SwaggerParser.validate>[0]),
    ).resolves.toBeDefined();
  });

  it("matches the committed docs/openapi.yaml (run `cd backend && npm run generate:openapi` if this fails)", () => {
    const generated = yaml.stringify(generateOpenApi()).replace(/\r\n/g, "\n");
    const committed = readFileSync(committedSpecPath, "utf8").replace(/\r\n/g, "\n");
    expect(generated).toBe(committed);
  });

  it("matches the committed docs/openapi.json (run `cd backend && npm run generate:openapi` if this fails)", () => {
    const generatedYaml = yaml.stringify(generateOpenApi());
    const generatedJson = `${JSON.stringify(sortKeysDeep(yaml.parse(generatedYaml)), null, 2)}\n`;
    const committedJson = readFileSync(committedJsonPath, "utf8").replace(/\r\n/g, "\n");
    expect(generatedJson).toBe(committedJson);
  });
});

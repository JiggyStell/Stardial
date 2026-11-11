import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as yaml from "yaml";
import { generateOpenApi } from "../openapi.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const committedSpecPath = join(__dirname, "..", "..", "..", "docs", "openapi.yaml");

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
    const generated = yaml.stringify(generateOpenApi());
    const committed = readFileSync(committedSpecPath, "utf8");
    expect(generated).toBe(committed);
  });
});

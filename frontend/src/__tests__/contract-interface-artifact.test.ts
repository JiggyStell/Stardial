import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ContractErrors } from "@/generated/contract-types";

type ContractInterfaceArtifact = {
  schemaVersion: number;
  errors: Array<{ name: string; code: number }>;
  methods: Array<{ name: string }>;
};

const interfacePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../contracts/interface/stardial.contract-interface.json"
);

const contractInterface = JSON.parse(
  readFileSync(interfacePath, "utf8")
) as ContractInterfaceArtifact;

describe("contract interface artifact (frontend)", () => {
  it("matches generated ContractErrors codes", () => {
    expect(contractInterface.schemaVersion).toBe(1);
    expect(contractInterface.errors).toHaveLength(Object.keys(ContractErrors).length);

    for (const { name, code } of contractInterface.errors) {
      expect(ContractErrors[name as keyof typeof ContractErrors]).toBe(code);
    }
  });

  it("includes release-ops control plane methods", () => {
    const names = contractInterface.methods.map((m) => m.name);
    expect(names).toContain("pause_distributions");
    expect(names).toContain("unpause_distributions");
    expect(names).toContain("is_distributions_paused");
  });
});

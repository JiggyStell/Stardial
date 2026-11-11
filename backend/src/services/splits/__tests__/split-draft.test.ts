import { describe, it, expect, beforeEach } from "vitest";
import {
  resetSplitDraftRegistryForTests,
  saveDraft,
  publishDraft,
  discardDraft,
  assertNotDraft,
  isFinancialActionBlockedForDraft,
  getDraft,
} from "../split-draft.registry.js";

/** Rejection codes live on `error.code`; `error.message` is the human wording. */
function rejection(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected call to be rejected");
}

describe("split draft support (#1302)", () => {
  beforeEach(() => {
    resetSplitDraftRegistryForTests();
  });

  it("saves incomplete configuration as a draft", () => {
    const draft = saveDraft({
      owner: "GOWNER",
      title: "WIP split",
      collaborators: [{ address: "GA" }],
    });
    expect(draft.status).toBe("draft");
    expect(draft.title).toBe("WIP split");
    expect(isFinancialActionBlockedForDraft(draft)).toBe(true);
    expect(rejection(() => assertNotDraft(draft))).toMatchObject({
      code: "financial_action_on_draft",
    });
  });

  it("distinguishes draft from published", () => {
    const draft = saveDraft({
      owner: "GOWNER",
      projectId: "proj1",
      token: "GTOKEN",
      collaborators: [
        { address: "GA", basisPoints: 5000 },
        { address: "GB", basisPoints: 5000 },
      ],
    });
    const published = publishDraft({ id: draft.id, owner: "GOWNER" });
    expect(published.status).toBe("published");
    expect(isFinancialActionBlockedForDraft(published)).toBe(false);
    assertNotDraft(published);
  });

  it("prevents financial actions while still a draft", () => {
    const draft = saveDraft({
      owner: "GOWNER",
      projectId: "proj1",
      token: "GTOKEN",
      collaborators: [
        { address: "GA", basisPoints: 5000 },
        { address: "GB", basisPoints: 5000 },
      ],
    });
    expect(rejection(() => assertNotDraft(draft))).toMatchObject({
      code: "financial_action_on_draft",
    });
  });

  it("rejects publish when incomplete", () => {
    const draft = saveDraft({ owner: "GOWNER", title: "no token" });
    expect(rejection(() => publishDraft({ id: draft.id, owner: "GOWNER" }))).toMatchObject({
      code: "draft_incomplete",
    });
  });

  it("allows discard of a draft", () => {
    const draft = saveDraft({ owner: "GOWNER" });
    const discarded = discardDraft({ id: draft.id, owner: "GOWNER" });
    expect(discarded.status).toBe("discarded");
    expect(getDraft(draft.id)?.status).toBe("discarded");
  });
});

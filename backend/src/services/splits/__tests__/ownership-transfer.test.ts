import { describe, it, expect, beforeEach } from "vitest";
import {
  resetOwnershipTransferForTests,
  setProjectOwner,
  transferOwnership,
  isCurrentOwner,
  listOwnershipAudit,
  getProjectOwner,
} from "../ownership-transfer.js";

/** Rejection codes live on `error.code`; `error.message` is the human wording. */
function rejection(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected call to be rejected");
}

describe("ownership transfer (#1297)", () => {
  beforeEach(() => {
    resetOwnershipTransferForTests();
  });

  it("requires authorization from the current owner", () => {
    setProjectOwner("proj1", "GOWNER");
    expect(
      rejection(() =>
        transferOwnership({
          projectId: "proj1",
          actor: "GSTRANGER",
          newOwner: "GNEW",
        }),
      ),
    ).toMatchObject({ code: "forbidden_not_owner" });
  });

  it("validates the new owner", () => {
    setProjectOwner("proj1", "GOWNER");
    expect(() =>
      transferOwnership({
        projectId: "proj1",
        actor: "GOWNER",
        newOwner: "GOWNER",
      }),
    ).toThrow(/new_owner_same_as_current/);
    expect(
      rejection(() =>
        transferOwnership({
          projectId: "proj1",
          actor: "GOWNER",
          newOwner: "x",
        }),
      ),
    ).toMatchObject({ code: "invalid_new_owner" });
  });

  it("records the transfer in audit history and updates access", () => {
    setProjectOwner("proj1", "GOWNER");
    expect(isCurrentOwner("proj1", "GOWNER")).toBe(true);
    expect(isCurrentOwner("proj1", "GNEW")).toBe(false);

    const record = transferOwnership({
      projectId: "proj1",
      actor: "GOWNER",
      newOwner: "GNEWOWNER",
    });

    expect(record.fromOwner).toBe("GOWNER");
    expect(record.toOwner).toBe("GNEWOWNER");
    expect(getProjectOwner("proj1")).toBe("GNEWOWNER");
    expect(isCurrentOwner("proj1", "GOWNER")).toBe(false);
    expect(isCurrentOwner("proj1", "GNEWOWNER")).toBe(true);

    const audit = listOwnershipAudit("proj1");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("ownership.transferred");
    expect(audit[0]?.fromOwner).toBe("GOWNER");
    expect(audit[0]?.toOwner).toBe("GNEWOWNER");
  });
});

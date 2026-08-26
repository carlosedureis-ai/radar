import { describe, expect, it } from "vitest";
import { validateNewPassword } from "./password";

describe("validateNewPassword", () => {
  it("accepts matching passwords with at least eight characters", () => {
    expect(validateNewPassword("camadas8", "camadas8")).toEqual({
      longEnough: true,
      matches: true,
      valid: true,
    });
  });

  it("rejects short or mismatched passwords", () => {
    expect(validateNewPassword("curta", "curta").valid).toBe(false);
    expect(validateNewPassword("camadas8", "camadas9").valid).toBe(false);
  });
});

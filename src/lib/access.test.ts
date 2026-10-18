import { describe, expect, it } from "vitest";
import { canManageUsers } from "./access";

describe("exclusive user and team administration", () => {
  it("allows the active superadministrator", () => expect(canManageUsers("super_admin", true)).toBe(true));
  it("denies the previous admin role", () => expect(canManageUsers("admin", true)).toBe(false));
  it("denies photographers", () => expect(canManageUsers("photographer", true)).toBe(false));
  it("denies accounts without a role", () => expect(canManageUsers(null, true)).toBe(false));
  it("denies disabled superadministrators", () => expect(canManageUsers("super_admin", false)).toBe(false));
});
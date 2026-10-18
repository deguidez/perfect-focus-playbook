import { z } from "zod";

export function canManageUsers(role: string | null, active: boolean) {
  return role === "super_admin" && active;
}

export const accountInput = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  displayName: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
});

export const teamInput = z.object({ name: z.string().trim().min(1).max(100) });
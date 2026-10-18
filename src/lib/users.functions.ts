import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { accountInput, teamInput, canManageUsers } from "./access";

async function authorize(client: SupabaseClient<Database>, id: string) {
  const [role, profile] = await Promise.all([
    client.rpc("has_role", { _user_id: id, _role: "super_admin" }),
    client.from("profiles").select("active").eq("id", id).single(),
  ]);
  if (role.error || profile.error || !canManageUsers(role.data ? "super_admin" : null, profile.data?.active === true)) {
    throw new Error("Somente o superadministrador pode gerenciar usuários e equipes.");
  }
}

export const listManagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const [profiles, roles, teams, memberships] = await Promise.all([
      admin.from("profiles").select("*").order("created_at"),
      admin.from("user_roles").select("user_id,role"),
      admin.from("teams").select("*").order("name"),
      admin.from("team_members").select("*"),
    ]);
    if (profiles.error || roles.error || teams.error || memberships.error) throw new Error("Não foi possível carregar a administração.");
    const users = await Promise.all((profiles.data ?? []).map(async (p) => {
      const { data, error } = await admin.auth.admin.getUserById(p.id);
      if (error) throw new Error("Não foi possível carregar uma conta.");
      return { ...p, email: data.user.email ?? "", role: roles.data?.find((r) => r.user_id === p.id && r.role === "super_admin")?.role ?? "photographer" };
    }));
    return { users, teams: teams.data ?? [], memberships: memberships.data ?? [] };
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountInput.parse(d))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const created = await admin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Não foi possível criar a conta. Verifique o e-mail e a senha.");
    const id = created.data.user.id;
    const profile = await admin.from("profiles").upsert({ id, display_name: data.displayName, active: true });
    const role = await admin.from("user_roles").insert({ user_id: id, role: "photographer" });
    if (profile.error || role.error) {
      await admin.auth.admin.deleteUser(id);
      throw new Error("Não foi possível liberar o acesso da conta.");
    }
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), displayName: z.string().trim().min(1).max(100), active: z.boolean(), password: z.string().min(12).max(128).optional(), teamIds: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId);
    if (data.id === context.userId && !data.active) throw new Error("Você não pode desativar seu próprio acesso.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const auth = await admin.auth.admin.updateUserById(data.id, { ...(data.password ? { password: data.password } : {}), ban_duration: data.active ? "none" : "876000h" });
    if (auth.error) throw new Error("Não foi possível atualizar o acesso.");
    const profile = await admin.from("profiles").update({ display_name: data.displayName, active: data.active }).eq("id", data.id);
    if (profile.error) throw new Error("Não foi possível salvar o usuário.");
    const { error } = await admin.rpc("replace_team_memberships", { _user_id: data.id, _team_ids: data.teamIds });
    if (error) throw new Error("Não foi possível salvar as equipes.");
    return { ok: true };
  });

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teamInput.extend({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const result = data.id ? await admin.from("teams").update({ name: data.name }).eq("id", data.id) : await admin.from("teams").insert({ name: data.name, created_by: context.userId });
    if (result.error) throw new Error("Não foi possível salvar a equipe.");
    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await authorize(context.supabase, context.userId);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.from("teams").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível remover a equipe.");
    return { ok: true };
  });
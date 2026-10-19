import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { canManageUsers } from "@/lib/access";
import { listManagement, createAccount, updateAccount, saveTeam, deleteTeam } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [
    { title: "Usuários e equipes — FocoAI" }, { name: "description", content: "Administração de contas e equipes de fotógrafos." },
    { property: "og:title", content: "Usuários e equipes — FocoAI" }, { property: "og:description", content: "Gerenciamento exclusivo do superadministrador." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Team,
});

type UserRow = Awaited<ReturnType<typeof listManagement>>["users"][number];
function Team() {
  const { role, active, user } = useAuth();
  const allowed = canManageUsers(role, active);
  const qc = useQueryClient();
  const load = useServerFn(listManagement);
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const teamSave = useServerFn(saveTeam);
  const teamDelete = useServerFn(deleteTeam);
  const { data, isPending, error } = useQuery({ queryKey: ["management", user?.id], queryFn: () => load(), enabled: allowed });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  async function refresh() { await qc.invalidateQueries({ queryKey: ["management"] }); }
  function edit(u: UserRow | null) {
    setEditing(u); setName(u?.display_name ?? ""); setEmail(u?.email ?? ""); setPassword(""); setEnabled(u?.active ?? true);
    setTeamIds(data?.memberships.filter((m) => m.user_id === u?.id).map((m) => m.team_id) ?? []); setOpen(true);
  }
  async function saveUser(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await update({ data: { id: editing.id, displayName: name, active: enabled, teamIds, ...(password ? { password } : {}) } });
      else await create({ data: { email, displayName: name, password } });
      setPassword(""); setOpen(false); await refresh(); toast.success(editing ? "Usuário atualizado" : "Usuário criado");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  async function submitTeam(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await teamSave({ data: { name: teamName, ...(teamId ? { id: teamId } : {}) } }); setTeamName(""); setTeamId(undefined); await refresh(); toast.success("Equipe salva"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!removeId) return; setBusy(true);
    try { await teamDelete({ data: { id: removeId } }); setRemoveId(null); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível remover."); }
    finally { setBusy(false); }
  }
  if (!allowed) return <main className="mx-auto max-w-5xl px-6 py-12"><Shield className="text-primary" /><h1 className="mt-4 text-3xl">Acesso restrito</h1><p className="mt-3 text-muted-foreground">Somente o superadministrador pode gerenciar usuários e equipes.</p></main>;
  return <main className="mx-auto max-w-5xl px-6 py-10">
    <h1 className="text-3xl md:text-4xl">Usuários e equipes</h1>
    <Tabs defaultValue="users" className="mt-8">
      <TabsList><TabsTrigger value="users"><Users size={16} className="mr-2" />Usuários</TabsTrigger><TabsTrigger value="teams">Equipes</TabsTrigger></TabsList>
      {isPending && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {error && <p role="alert" className="mt-6 text-destructive">Não foi possível carregar os usuários. <Button variant="outline" onClick={refresh}>Tentar novamente</Button></p>}
      <TabsContent value="users">
        <div className="my-6 flex items-center justify-between"><p className="font-mono text-sm text-muted-foreground">{data?.users.length ?? 0} contas</p><Button onClick={() => edit(null)}><Plus size={16} />Criar usuário</Button></div>
        <div className="divide-y border-y">{data?.users.map((u) => <div key={u.id} className="flex items-center gap-4 py-5">
          <div className="min-w-0 flex-1"><p className="break-words font-semibold">{u.display_name || u.email}</p><p className="break-all text-sm text-muted-foreground">{u.email}</p><p className="mt-1 text-xs text-muted-foreground">{u.role === "super_admin" ? "Superadministrador" : "Fotógrafo"} · {u.active ? "Ativo" : "Desativado"}</p><p className="mt-1 text-xs text-primary">{data.memberships.filter((m) => m.user_id === u.id).map((m) => data.teams.find((t) => t.id === m.team_id)?.name).filter(Boolean).join(" · ")}</p></div>
          <Button variant="ghost" size="icon" aria-label={`Editar ${u.email}`} title="Editar usuário" onClick={() => edit(u)}><Pencil size={16} /></Button>
        </div>)}</div>
      </TabsContent>
      <TabsContent value="teams">
        <form onSubmit={submitTeam} className="my-6 flex flex-wrap gap-3"><Input aria-label="Nome da equipe" placeholder="Nome da equipe" required maxLength={100} className="min-w-0 flex-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} /><Button type="submit" disabled={busy}><Plus size={16} />{teamId ? "Salvar equipe" : "Criar equipe"}</Button>{teamId && <Button variant="outline" type="button" onClick={() => { setTeamId(undefined); setTeamName(""); }}>Cancelar</Button>}</form>
        <div className="divide-y border-y">{data?.teams.length === 0 && <p className="py-6 text-muted-foreground">Nenhuma equipe.</p>}{data?.teams.map((t) => <div key={t.id} className="flex items-center gap-3 py-5"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{t.name}</p><p className="text-sm text-muted-foreground">{data.memberships.filter((m) => m.team_id === t.id).length} membros</p></div><Button variant="ghost" size="icon" title="Editar equipe" aria-label={`Editar ${t.name}`} onClick={() => { setTeamId(t.id); setTeamName(t.name); }}><Pencil size={16} /></Button><Button variant="ghost" size="icon" title="Remover equipe" aria-label={`Remover ${t.name}`} onClick={() => setRemoveId(t.id)}><Trash2 size={16} /></Button></div>)}</div>
      </TabsContent>
    </Tabs>
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPassword(""); }}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar usuário" : "Criar usuário"}</DialogTitle></DialogHeader>
      <form onSubmit={saveUser} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="account-name">Nome</Label><Input id="account-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="account-email">E-mail</Label><Input id="account-email" type="email" required disabled={!!editing} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="account-password">{editing ? "Nova senha (opcional)" : "Senha inicial"}</Label><Input id="account-password" type="password" autoComplete="new-password" minLength={12} required={!editing} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {editing && <><div className="flex items-center justify-between"><Label htmlFor="active-account">Acesso ativo</Label><Switch id="active-account" disabled={editing.id === user?.id} checked={enabled} onCheckedChange={setEnabled} /></div><fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Equipes</legend>{data?.teams.map((t) => <label key={t.id} className="flex items-center gap-3 text-sm"><Checkbox checked={teamIds.includes(t.id)} onCheckedChange={(v) => setTeamIds((ids) => v === true ? [...ids, t.id] : ids.filter((id) => id !== t.id))} />{t.name}</label>)}</fieldset></>}
        <Button className="w-full" disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar usuário"}</Button>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!removeId} onOpenChange={(v) => { if (!v) setRemoveId(null); }}><DialogContent><DialogHeader><DialogTitle>Remover equipe?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Os usuários e seus álbuns serão mantidos.</p><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setRemoveId(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={remove}>Remover equipe</Button></div></DialogContent></Dialog>
  </main>;
}

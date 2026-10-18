import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Equipe — FocoAI" },
      { name: "description", content: "Convide outros fotógrafos para usar a IA." },
      { property: "og:title", content: "Equipe — FocoAI" },
      { property: "og:description", content: "Convide outros fotógrafos para usar a IA." },
    ],
  }),
  component: Team,
});

function Team() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return toast.error("E-mail inválido");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("invitations").insert({ email: clean, invited_by: u.user!.id });
    if (error) return toast.error(error.message.includes("duplicate") ? "Já convidado" : error.message);
    setEmail("");
    toast.success("Convite criado");
    qc.invalidateQueries({ queryKey: ["invites"] });
  }

  async function remove(id: string) {
    await supabase.from("invitations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["invites"] });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-4xl">Equipe</h1>
      <p className="mt-2 text-muted-foreground">
        Adicione o e-mail Google do fotógrafo. Depois envie o link do app para ele — ao entrar com esse e-mail, o acesso é liberado.
      </p>
      <form onSubmit={invite} className="mt-6 flex gap-2">
        <Input type="email" placeholder="fotografo@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit">Convidar</Button>
      </form>
      <ul className="mt-8 divide-y rounded-lg border">
        {invites.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum convite.</li>}
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between p-4">
            <div>
              <p>{i.email}</p>
              <p className="font-mono text-xs text-muted-foreground">{i.accepted_at ? "ativo" : "pendente"}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(i.id)}>
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}

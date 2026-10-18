import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/albums/")({
  head: () => ({
    meta: [
      { title: "Álbuns — FocoAI" },
      { name: "description", content: "Seus álbuns de fotos esportivas." },
      { property: "og:title", content: "Álbuns — FocoAI" },
      { property: "og:description", content: "Seus álbuns de fotos esportivas." },
    ],
  }),
  component: Albums,
});

function Albums() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const { data, error } = await supabase.from("albums").select("id,name,created_at,preset_name").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("albums").insert({ name: name.trim(), owner_id: u.user!.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setName("");
    qc.invalidateQueries({ queryKey: ["albums"] });
    navigate({ to: "/albums/$albumId", params: { albumId: data.id } });
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-4xl">Álbuns</h1>
      <form onSubmit={create} className="mt-6 flex max-w-lg gap-2">
        <Input placeholder="Nome do evento (ex: Maratona SP 2026)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Criar álbum</Button>
      </form>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-muted-foreground">carregando…</p>}
        {!isLoading && albums.length === 0 && <p className="text-muted-foreground">Nenhum álbum ainda.</p>}
        {albums.map((a) => (
          <Link
            key={a.id}
            to="/albums/$albumId"
            params={{ albumId: a.id }}
            className="rounded-lg border bg-card p-5 transition-colors hover:border-primary"
          >
            <p className="text-lg font-semibold">{a.name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleDateString("pt-BR")} {a.preset_name ? `· ${a.preset_name}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

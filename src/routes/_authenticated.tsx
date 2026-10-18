import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

function Layout() {
  const { session, role, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center font-mono text-sm text-muted-foreground">carregando…</div>;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl">Aguardando convite</h1>
          <p className="mt-3 text-muted-foreground">
            A conta <span className="text-foreground">{user?.email}</span> ainda não foi convidada. Peça ao fotógrafo principal para
            enviar um convite para este e-mail.
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-6 border-b bg-background/90 px-6 backdrop-blur">
        <Link to="/albums" className="font-display text-lg">
          Foco<span className="text-primary">AI</span>
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/albums" activeProps={{ className: "text-foreground" }}>
            Álbuns
          </Link>
          {role === "admin" && (
            <Link to="/team" activeProps={{ className: "text-foreground" }}>
              Equipe
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden md:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

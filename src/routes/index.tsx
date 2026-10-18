import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import hero from "@/assets/hero-athlete.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FocoAI — seleção de fotos esportivas com IA" },
      { name: "description", content: "Ajuste o nível de foco no rosto do atleta e separe suas fotos em pastas automaticamente." },
      { property: "og:title", content: "FocoAI — seleção de fotos esportivas com IA" },
      { property: "og:description", content: "Fotos boas, desfocadas, olhos fechados e cabeça cortada separadas em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/albums" });
  }, [session, navigate]);

  async function signIn() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar com Google");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <img src={hero} alt="Atleta em foco" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="absolute inset-0 bg-hero-fade" />
      <div className="relative z-10 flex min-h-screen max-w-2xl flex-col justify-center px-8 md:px-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">FocoAI</p>
        <h1 className="mt-4 text-5xl leading-[0.95] md:text-7xl">O atleta em foco. O resto, separado.</h1>
        <p className="mt-6 max-w-md text-lg text-muted-foreground">
          A IA analisa o rosto do atleta principal e separa suas fotos em boas, desfocadas, olhos fechados e cabeça cortada —
          com seu preset do Lightroom aplicado.
        </p>
        <div className="mt-10">
          <Button size="lg" onClick={signIn} className="h-12 px-8 text-base">
            Entrar com Google
          </Button>
        </div>
      </div>
    </main>
  );
}

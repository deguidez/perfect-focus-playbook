import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/albums" });
  }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError("E-mail ou senha incorretos, ou acesso desativado.");
      else { setPassword(""); await navigate({ to: "/albums" }); }
    } catch { toast.error("Não foi possível entrar. Tente novamente."); }
    finally { setBusy(false); }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <img src={hero} alt="Atleta em foco" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="absolute inset-0 bg-hero-fade" />
      <div className="relative z-10 flex min-h-screen max-w-2xl flex-col justify-center px-8 md:px-16">
        <h1 className="text-5xl md:text-7xl">Foco<span className="text-primary">AI</span></h1>
        <p className="mt-4 text-lg text-muted-foreground">Entre no seu espaço de fotografia.</p>
        <form onSubmit={signIn} className="mt-8 max-w-sm space-y-5">
          <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" className="pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</Button></div></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} size="lg" className="w-full"><LogIn size={18} />{busy ? "Entrando…" : "Entrar"}</Button>
          <Link to="/reset-password" className="block text-center text-sm text-muted-foreground">Esqueci minha senha</Link>
        </form>
      </div>
    </main>
  );
}

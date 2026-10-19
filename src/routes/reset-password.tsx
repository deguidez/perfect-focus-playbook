import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Recuperar senha — FocoAI" }, { name: "description", content: "Recupere o acesso ao seu espaço FocoAI." },
    { property: "og:title", content: "Recuperar senha — FocoAI" }, { property: "og:description", content: "Recuperação segura de acesso ao FocoAI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const isRecovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    setRecovery(isRecovery);
    void supabase.auth.getSession().then(({ data }) => setReady(isRecovery && !!data.session));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (recovery) {
        if (!ready) { setError("Link inválido ou expirado. Solicite outro link."); return; }
        if (password !== confirm) { setError("As senhas não são iguais."); return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) { setError("Não foi possível alterar a senha. Use uma senha forte ou solicite outro link."); return; }
        setPassword(""); setConfirm("");
        await supabase.auth.signOut();
        setMessage("Senha alterada. Entre com sua nova senha.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) { setError("Não foi possível enviar o link. Tente novamente ou contate o superadministrador."); return; }
        setMessage("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.");
      }
    } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-6 py-16">
    <Link to="/" className="font-display text-xl">Foco<span className="text-primary">AI</span></Link>
    <h1 className="mt-8 text-3xl">{recovery ? "Nova senha" : "Recuperar senha"}</h1>
    <form onSubmit={submit} className="mt-8 space-y-5">
      {recovery ? <><div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={12} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div></> : <div className="space-y-2"><Label htmlFor="recovery-email">E-mail</Label><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Aguarde…" : recovery ? "Salvar senha" : "Enviar link"}</Button>
      <Link to="/" className="block text-center text-sm text-muted-foreground">Voltar à entrada</Link>
    </form>
  </main>;
}
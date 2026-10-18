import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "photographer" | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setRole(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!data?.length) {
        await supabase.rpc("claim_invitation");
        ({ data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id));
      }
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role);
      setRole(roles.includes("admin") ? "admin" : roles.includes("photographer") ? "photographer" : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { session, user: session?.user ?? null, role, loading };
}

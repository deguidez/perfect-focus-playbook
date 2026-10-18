import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { clearAlbumSessions } from "./album-session";

export type Role = "super_admin" | "admin" | "photographer" | null;
type AuthState = { session: Session | null; user: Session["user"] | null; role: Role; loading: boolean; active: boolean };
const AuthContext = createContext<AuthState>({ session: null, user: null, role: null, loading: true, active: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        clearAlbumSessions();
        void qc.cancelQueries();
        qc.clear();
      }
      void router.invalidate();
      if (event !== "SIGNED_OUT") void qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc, router]);

  useEffect(() => {
    if (!session) {
      setRole(null);
      setActive(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data }, profile] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("profiles").select("active").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role);
      setRole(roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : roles.includes("photographer") ? "photographer" : null);
      setActive(profile.data?.active === true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, active }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }

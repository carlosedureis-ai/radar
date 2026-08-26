import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

type SignUpInput = { email: string; password: string; displayName: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  recoveryMode: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  finishPasswordRecovery(): void;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
        if (event === "SIGNED_OUT") setRecoveryMode(false);
        setSession(nextSession);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: Boolean(supabase),
      recoveryMode,
      async signIn(email, password) {
        if (!supabase) throw new Error("Supabase Auth ainda não foi configurado.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp({ email, password, displayName }) {
        if (!supabase) throw new Error("Supabase Auth ainda não foi configurado.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        return { needsEmailConfirmation: !data.session };
      },
      async sendPasswordReset(email) {
        if (!supabase) throw new Error("Supabase Auth ainda não foi configurado.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) throw new Error("Supabase Auth ainda não foi configurado.");
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error("Este link de recuperação expirou. Solicite um novo link.");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      finishPasswordRecovery() {
        setRecoveryMode(false);
        setSession(null);
        if (supabase) void supabase.auth.signOut({ scope: "local" });
      },
      async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [loading, recoveryMode, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return value;
}

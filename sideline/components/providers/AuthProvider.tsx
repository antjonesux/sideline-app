"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/authErrors";
import type { Session, User } from "@supabase/supabase-js";

type AuthResult = { error: string | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult & { confirmationRequired: boolean }>;
  signInWithGoogle: (returnTo?: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  resendVerificationEmail: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => {
    async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: error ? mapAuthError(error.message) : null };
    }

    async function signUp(
      email: string,
      password: string,
    ): Promise<AuthResult & { confirmationRequired: boolean }> {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${origin}/auth/confirm` },
      });
      if (error) return { error: mapAuthError(error.message), confirmationRequired: false };
      return { error: null, confirmationRequired: !data.session };
    }

    async function signInWithGoogle(returnTo?: string): Promise<AuthResult> {
      const dest = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(dest)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      return { error: error ? mapAuthError(error.message) : null };
    }

    async function signOut(): Promise<AuthResult> {
      const { error } = await supabase.auth.signOut();
      return { error: error ? mapAuthError(error.message) : null };
    }

    async function resetPassword(email: string): Promise<AuthResult> {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      });
      if (!error) return { error: null };
      const lower = error.message.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("too many")) {
        return { error: "Too many reset attempts. Wait a few minutes, then try again." };
      }
      return { error: mapAuthError(error.message) };
    }

    async function updatePassword(newPassword: string): Promise<AuthResult> {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? mapAuthError(error.message) : null };
    }

    async function resendVerificationEmail(): Promise<AuthResult> {
      const email = user?.email?.trim();
      if (!email) return { error: mapAuthError("missing email") };
      const { error } = await supabase.auth.resend({ type: "signup", email });
      return { error: error ? mapAuthError(error.message) : null };
    }

    return {
      user,
      session,
      isLoading,
      signInWithPassword,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendVerificationEmail,
    };
  }, [supabase, user, session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

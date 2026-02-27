import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  roleResolved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  roleResolved: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleResolved, setRoleResolved] = useState(false);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) {
        console.error("checkAdmin error:", error);
        setIsAdmin(false);
        return false;
      } else {
        setIsAdmin(!!data);
        return !!data;
      }
    } catch (err) {
      console.error("checkAdmin unexpected error:", err);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async (nextSession: Session | null) => {
      if (cancelled) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setRoleResolved(false);

      try {
        if (nextSession?.user) {
          await checkAdmin(nextSession.user.id);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("resolveSession error:", err);
        setIsAdmin(false);
      } finally {
        if (!cancelled) {
          setRoleResolved(true);
          setLoading(false);
        }
      }
    };

    const forceStopLoading = window.setTimeout(() => {
      if (!cancelled) {
        setRoleResolved(true);
        setLoading(false);
      }
    }, 7000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void resolveSession(nextSession);
      }
    );

    void supabase.auth.getSession()
      .then(({ data: { session } }) => {
        void resolveSession(session);
      })
      .catch((err) => {
        console.error("getSession error:", err);
        if (!cancelled) {
          setIsAdmin(false);
          setRoleResolved(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(forceStopLoading);
    };
  }, []);

  const signOut = async () => {
    // Immediately clear local auth state so UI can redirect without waiting network
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setRoleResolved(true);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("signOut timeout")), 2000)
      );

      const result = await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise,
      ]) as { error?: { message?: string } };

      if (result?.error) {
        console.error("signOut global error:", result.error);
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (err) {
      console.error("signOut unexpected error:", err);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localErr) {
        console.error("signOut local fallback error:", localErr);
      }
    } finally {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.includes("-auth-token")) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, roleResolved, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

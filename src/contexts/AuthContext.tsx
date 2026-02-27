import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
    let initialSessionHandled = false;
    const forceStopLoading = window.setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await checkAdmin(session.user.id);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("onAuthStateChange error:", err);
          setIsAdmin(false);
        } finally {
          setLoading(false);
          window.clearTimeout(forceStopLoading);
          initialSessionHandled = true;
        }
      }
    );

    // Only use getSession as fallback if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialSessionHandled) return;
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkAdmin(session.user.id);
        }
      } catch (err) {
        console.error("getSession error:", err);
        setIsAdmin(false);
      } finally {
        if (!initialSessionHandled) {
          setLoading(false);
          window.clearTimeout(forceStopLoading);
        }
      }
    }).catch(() => {
      if (!initialSessionHandled) {
        setLoading(false);
        window.clearTimeout(forceStopLoading);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(forceStopLoading);
    };
  }, []);

  const signOut = async () => {
    // Immediately clear local auth state so UI can redirect without waiting network
    setUser(null);
    setSession(null);
    setIsAdmin(false);

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
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isFullBanned: boolean;
  loading: boolean;
  roleResolved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isFullBanned: false,
  loading: true,
  roleResolved: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFullBanned, setIsFullBanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleResolved, setRoleResolved] = useState(false);

  const adminCheckInFlight = useRef<Map<string, Promise<boolean>>>(new Map());
  const banCheckInFlight = useRef<Map<string, Promise<boolean>>>(new Map());

  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);
  }, []);

  const checkAdmin = useCallback(async (userId: string): Promise<boolean> => {
    const cached = adminCheckInFlight.current.get(userId);
    if (cached) return cached;

    const request = (async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        }),
        4500,
        { data: false, error: { message: "has_role timeout" } } as any,
      );
      if (error) {
        console.error("checkAdmin error:", error);
        setIsAdmin(false);
        return false;
      }

      const next = !!data;
      setIsAdmin(next);
      return next;
    } catch (err) {
      console.error("checkAdmin unexpected error:", err);
      setIsAdmin(false);
      return false;
    } finally {
      adminCheckInFlight.current.delete(userId);
    }
    })();

    adminCheckInFlight.current.set(userId, request);
    return request;
  }, [withTimeout]);

  const checkFullBan = useCallback(async (userId: string): Promise<boolean> => {
    const cached = banCheckInFlight.current.get(userId);
    if (cached) return cached;

    const request = (async () => {
      try {
        const { data } = await withTimeout(
          supabase
            .from("profiles")
            .select("is_banned, ban_type")
            .eq("user_id", userId)
            .single(),
          4500,
          { data: null } as any,
        );

        const fullBanned = !!(data?.is_banned && data?.ban_type === "full");
        setIsFullBanned(fullBanned);
        return fullBanned;
      } catch (err) {
        console.error("checkFullBan unexpected error:", err);
        setIsFullBanned(false);
        return false;
      } finally {
        banCheckInFlight.current.delete(userId);
      }
    })();

    banCheckInFlight.current.set(userId, request);
    return request;
  }, [withTimeout]);

  useEffect(() => {
    let cancelled = false;
    let lastSessionId: string | null = null;
    let initialResolved = false;
    let resolving = false;

    const resolveSession = async (nextSession: Session | null) => {
      if (cancelled) return;

      const nextId = nextSession?.access_token ?? null;
      if (nextId === lastSessionId && (initialResolved || resolving)) return;

      resolving = true;
      lastSessionId = nextId;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        if (nextSession?.user) {
          await Promise.allSettled([
            checkAdmin(nextSession.user.id),
            checkFullBan(nextSession.user.id),
          ]);
        } else {
          setIsAdmin(false);
          setIsFullBanned(false);
        }
      } catch (err) {
        console.error("resolveSession error:", err);
        setIsAdmin(false);
      } finally {
        if (!cancelled) {
          initialResolved = true;
          setRoleResolved(true);
          setLoading(false);
        }
        resolving = false;
      }
    };

    const forceStopLoading = window.setTimeout(() => {
      if (!cancelled) {
        setRoleResolved(true);
        setLoading(false);
      }
    }, 7000);

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void resolveSession(session);
      })
      .catch((err) => {
        console.error("getSession error:", err);
        if (!cancelled) {
          initialResolved = true;
          setIsAdmin(false);
          setRoleResolved(true);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void resolveSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(forceStopLoading);
    };
  }, [checkAdmin, checkFullBan]);

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
    <AuthContext.Provider value={{ user, session, isAdmin, isFullBanned, loading, roleResolved, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

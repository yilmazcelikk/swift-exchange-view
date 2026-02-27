import { Component, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface BoundaryProps {
  children: ReactNode;
  onCrash: (error: unknown) => void;
}

interface BoundaryState {
  hasError: boolean;
}

class AdminErrorBoundaryInner extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onCrash(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminCrashGuard({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handlingRef = useRef(false);
  const [recovering, setRecovering] = useState(false);

  const recoverToLogin = useCallback(
    async (source: string, error?: unknown) => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      setRecovering(true);

      console.error("Admin crash detected:", source, error);

      try {
        await signOut();
      } catch (signOutError) {
        console.error("Admin crash signOut fallback:", signOutError);
      } finally {
        navigate("/login", { replace: true });

        window.setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.replace("/login");
          }
        }, 80);
      }
    },
    [navigate, signOut]
  );

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      void recoverToLogin("window_error", event.error ?? event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void recoverToLogin("unhandled_rejection", event.reason);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [recoverToLogin]);

  if (recovering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdminErrorBoundaryInner onCrash={(error) => void recoverToLogin("render_crash", error)}>
      {children}
    </AdminErrorBoundaryInner>
  );
}

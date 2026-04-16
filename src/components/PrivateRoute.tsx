import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { checkGate, resolveGateAccess } from "@/lib/gatekeeper";

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function PrivateRoute({ children, adminOnly = false }: PrivateRouteProps) {
  const { user, isAdmin, isModerator, isFullBanned, loading, roleResolved } = useAuth();
  const [searchParams] = useSearchParams();
  const [gateOpen, setGateOpen] = useState(() => checkGate(searchParams));
  const [gateLoading, setGateLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const validateGate = async () => {
      const allowed = await resolveGateAccess(new URLSearchParams(searchParams));

      if (!mounted) return;

      setGateOpen(allowed);
      setGateLoading(false);
    };

    void validateGate();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  if (gateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!gateOpen) {
    return <Navigate to="/" replace />;
  }

  if (loading || !roleResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?go=1" replace />;
  }

  if (isFullBanned && !adminOnly) {
    return <Navigate to="/blocked" replace />;
  }

  if (adminOnly && !isAdmin && !isModerator) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!adminOnly && (isAdmin || isModerator)) {
    return <Navigate to="/admin" replace />;
  }

  if (adminOnly) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

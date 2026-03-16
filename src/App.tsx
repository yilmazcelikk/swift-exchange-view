import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { WhatsAppButton } from "@/components/WhatsAppButton";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Blocked from "@/pages/Blocked";

// Lazy load heavy pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Trading = lazy(() => import("@/pages/Trading"));
const History = lazy(() => import("@/pages/History"));
const Finance = lazy(() => import("@/pages/Finance"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

function App() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) =>
      console.error("Unhandled promise rejection:", e.reason);
    const onError = (e: ErrorEvent) =>
      console.error("Unhandled window error:", e.error ?? e.message);

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return (
    <AppErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/blocked" element={<Blocked />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <LazyPage><Dashboard /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/trading"
                    element={
                      <PrivateRoute>
                        <LazyPage><Trading /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <PrivateRoute>
                        <LazyPage><History /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/finance"
                    element={
                      <PrivateRoute>
                        <LazyPage><Finance /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <LazyPage><Profile /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <PrivateRoute adminOnly>
                        <LazyPage><AdminLayout /></LazyPage>
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                <WhatsAppButton />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;

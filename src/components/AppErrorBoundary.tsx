import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global render crash:", error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center space-y-4">
            <h1 className="text-xl font-semibold text-foreground">Sayfa yüklenirken hata oluştu</h1>
            <p className="text-sm text-muted-foreground">
              Uygulama güvenli moda alındı. Sayfayı yenileyip tekrar deneyin.
            </p>
            <Button onClick={this.handleRefresh} className="w-full">
              Sayfayı Yenile
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

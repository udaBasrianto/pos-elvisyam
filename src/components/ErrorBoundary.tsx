import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Terjadi Gangguan Tampilan</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Komponen ini mengalami kendala rendering. Silakan muat ulang halaman untuk memulihkan tampilan.
          </p>
          <Button onClick={this.handleReload} className="gap-2 bg-gradient-primary">
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Halaman
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

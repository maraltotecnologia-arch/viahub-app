import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-3xl font-extrabold">
              <span className="gradient-text">Via</span>
              <span className="text-foreground">Hub</span>
            </h1>
            <p className="text-muted-foreground">Algo deu errado. Tente recarregar a página.</p>
            <Button variant="gradient" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

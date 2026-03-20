import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction, loading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12 animate-fade-in">
      <div className="h-20 w-20 rounded-2xl flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-foreground mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed mt-2">{description}</p>
      {actionLabel && onAction && (
        <Button variant="gradient" className="mt-6" onClick={onAction} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

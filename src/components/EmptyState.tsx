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
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-surface-container mb-4">
        <div className="text-on-surface-variant">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant text-center max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="gradient" className="mt-6" onClick={onAction} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

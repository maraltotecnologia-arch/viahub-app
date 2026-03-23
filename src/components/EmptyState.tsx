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
    <div className="flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 mb-5">
        {icon}
      </div>
      <h3 className="text-base font-semibold font-headline text-on-surface mb-1.5">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-xs mx-auto mb-6 font-body">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

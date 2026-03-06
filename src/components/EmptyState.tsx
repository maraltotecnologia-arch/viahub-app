import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-16 px-4">
      <div className="h-20 w-20 rounded-full flex items-center justify-center bg-primary/10">
        <div className="text-primary opacity-70">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed mt-2">{description}</p>
      {actionLabel && onAction && (
        <Button variant="gradient" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

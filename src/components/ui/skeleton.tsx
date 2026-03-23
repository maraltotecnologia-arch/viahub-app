import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-container-low dark:bg-surface-container-high", className)} {...props} />;
}

export { Skeleton };

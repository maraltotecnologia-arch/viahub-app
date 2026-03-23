import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-label transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-surface-container-highest text-on-surface-variant",
        destructive: "bg-error-container/50 text-error",
        outline: "text-on-surface border border-outline-variant/30",
        success: "bg-secondary-container/50 text-secondary",
        warning: "bg-[#ff9800]/10 text-[#e65100]",
        info: "bg-primary/10 text-primary",
        muted: "bg-surface-container-highest text-on-surface-variant",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

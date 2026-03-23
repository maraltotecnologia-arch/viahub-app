import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        secondary: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        destructive: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
        outline: "text-foreground border border-border",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        muted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
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

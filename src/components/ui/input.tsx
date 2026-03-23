import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border-none bg-surface-container-high px-4 py-2.5 text-sm font-body text-on-surface ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-on-surface-variant/50 transition-all duration-150 focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-container dark:focus:bg-surface-container-low",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

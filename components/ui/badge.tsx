import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-foreground bg-foreground text-background",
        outline: "border-border bg-background text-foreground",
        destructive: "border-[#FF5722] bg-[#FF5722] text-white",
        caution: "border-foreground bg-secondary text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

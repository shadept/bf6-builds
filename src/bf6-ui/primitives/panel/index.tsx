import * as React from "react";
import { cn } from "@/lib/utils";

import { cva, type VariantProps } from "class-variance-authority"

const panelVariants = cva(
  "relative overflow-hidden shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-bf-panel border border-slate-800",
        destructive: "border text-slate-100 overflow-hidden relative border-red-500/80 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
        accent: "bg-bf-blue/10 border-bf-blue/50",
        subtle: "bg-slate-800/50 border-slate-700",
      }
    },
    defaultVariants: {
      variant: "default",
    }
  }
)

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof panelVariants> {}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, children, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
className={cn(panelVariants({ variant }), className)}
        {...props}
      >
        <div className={cn(
          "absolute top-0 right-0 w-4 h-4 border-t border-r",
          variant === "destructive" ? "border-red-500/80" :
          variant === "accent" ? "border-bf-blue/50" :
          variant === "subtle" ? "border-slate-600" :
          "border-bf-blue/30"
        )} />
        <div className={cn(
          "absolute bottom-0 left-0 w-4 h-4 border-b border-l",
          variant === "destructive" ? "border-red-500/80" :
          variant === "accent" ? "border-bf-blue/50" :
          variant === "subtle" ? "border-slate-600" :
          "border-bf-blue/30"
        )} />
        {children}
      </div>
    );
  }
);

Panel.displayName = "BF6Panel";

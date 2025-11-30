import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "md" | "sm" | "xs" | "muted" | "danger" | "accent";
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant = "md", children, ...props }, ref) => {
    const variants: Record<string, string> = {
      md: "text-base",
      sm: "text-sm",
      xs: "text-xs",
      muted: "text-slate-400 text-sm",
      danger: "text-red-500 text-sm",
      accent: "text-bf-blue text-sm",
    };
    return (
      <p
        ref={ref}
        className={cn(variants[variant], "font-sans", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Text.displayName = "BF6Text";
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 1-to-1 visual clone of existing Badge
const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-widest font-display",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-bf-blue text-white shadow hover:bg-bf-blue/80",
        secondary:
          "border-transparent bg-slate-700 text-slate-200 hover:bg-slate-700/80",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-500/80",
        outline: "text-foreground border-slate-700",
        meta: "border-transparent bg-bf-orange text-white shadow-[0_0_10px_rgba(255,165,0,0.5)] animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BF6BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BF6BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { badgeVariants }

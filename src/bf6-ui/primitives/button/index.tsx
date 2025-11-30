import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Exact 1-to-1 clone of original button styles
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-display font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider font-display",
  {
    variants: {
      variant: {
        default:
          "bg-bf-blue text-white hover:bg-bf-blue/90 border border-bf-blue/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        destructive:
          "bg-red-500 text-destructive-foreground hover:bg-red-500/90",
        outline:
          "border border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white",
        secondary:
          "bg-bf-orange text-white hover:bg-bf-orange/80",
        ghost: "hover:bg-slate-800 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BF6ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, BF6ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "BF6Button"

export { buttonVariants }

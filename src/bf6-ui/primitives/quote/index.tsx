import * as React from "react"
import { cn } from "@/lib/utils"

export interface QuoteProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Quote = React.forwardRef<HTMLParagraphElement, QuoteProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-xl text-slate-400 max-w-3xl border-l-2 border-bf-blue pl-6", 
          className
        )}
        {...props}
      >
        {children}
      </p>
    )
  }
)

Quote.displayName = "BF6Quote"
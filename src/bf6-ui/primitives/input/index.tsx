import * as React from "react"
import { cn } from "@/lib/utils"

export interface BF6InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  addonLeft?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, BF6InputProps>(
  ({ className, type, addonLeft, ...props }, ref) => {
    return (
      <div className="relative bg-bf-panel border border-slate-800 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-bf-blue/30" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-bf-blue/30" />

        {addonLeft && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {addonLeft}
          </div>
        )}

        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full bg-transparent border-none h-10 px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            addonLeft ? "pl-10" : "",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "BF6Input"

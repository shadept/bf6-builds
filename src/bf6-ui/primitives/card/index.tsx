import * as React from "react"
import { cn } from "@/lib/utils"
import { Heading } from "@/bf6-ui/primitives/typography/Heading"
import { Text } from "@/bf6-ui/primitives/typography/Text"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-bf-panel border border-slate-800 text-slate-100 shadow-sm relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-bf-blue/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-bf-blue/30" />
      {props.children}
    </div>
  )
)
Card.displayName = "BF6Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "BF6CardHeader"

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>( 
  ({ className, ...props }, ref) => (
    <Heading level={3} ref={ref} className={cn("leading-none", className)} {...props} />
  )
)
CardTitle.displayName = "BF6CardTitle"

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>( 
  ({ className, ...props }, ref) => (
    <Text variant="muted" ref={ref} className={cn(className)} {...props} />
  )
)
CardDescription.displayName = "BF6CardDescription"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "BF6CardContent"

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "BF6CardFooter"
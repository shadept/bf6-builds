import * as React from "react";
import { cn } from "@/lib/utils";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, className, children, ...props }, ref) => {
    const tag = `h${level}` as keyof HTMLElementTagNameMap;
    const sizes: Record<number, string> = {
      1: "text-5xl md:text-7xl font-bold",
      2: "text-3xl font-bold",
      3: "text-2xl font-semibold",
      4: "text-xl font-semibold",
      5: "text-lg font-medium",
      6: "text-base font-medium",
    };
    return React.createElement(
      tag,
      {
        ref,
        className: cn(
          sizes[level],
          "font-display uppercase tracking-tight text-white",
          className
        ),
        ...props,
      },
      children
    );
  }
);

Heading.displayName = "BF6Heading";
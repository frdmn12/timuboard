import * as React from "react"
import { cn } from "@/lib/utils"

// Timuboard: no border, no shadow; separation comes from the cloud-card surface.
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("flex flex-col gap-4 rounded-card bg-card p-8 text-card-foreground", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("text-[clamp(32px,4vw,40px)] leading-none font-semibold tracking-[-0.03em]", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-[clamp(18px,2vw,24px)] leading-[1.3] text-muted-foreground", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />
}

export { Card, CardTitle, CardDescription, CardContent }

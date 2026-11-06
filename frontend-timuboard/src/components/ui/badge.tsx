import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-secondary font-medium whitespace-nowrap text-secondary-foreground",
  {
    variants: { size: { default: "px-4 py-2 text-base leading-[1.4]", sm: "px-2 py-0.5 text-xs" } },
    defaultVariants: { size: "default" },
  }
)

function Badge({ className, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ size }), className)} {...props} />
}

export { Badge }

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Timuboard: hari berbentuk pil bulat, terpilih = charcoal, hari ini = cincin; tanpa border.
function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full [--cell-size:--spacing(12)]", className)}
      classNames={{
        root: cn("w-full", d.root),
        months: cn("relative flex w-full flex-col gap-4", d.months),
        month: cn("flex w-full flex-col gap-4", d.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between", d.nav),
        button_previous: cn(buttonVariants({ variant: "secondary", size: "icon" }), "bg-background select-none", d.button_previous),
        button_next: cn(buttonVariants({ variant: "secondary", size: "icon" }), "bg-background select-none", d.button_next),
        month_caption: cn("flex h-10 w-full items-center justify-center", d.month_caption),
        caption_label: cn("text-xl font-semibold tracking-[-0.02em] capitalize select-none", d.caption_label),
        month_grid: cn("w-full border-collapse", d.month_grid),
        weekdays: cn("flex", d.weekdays),
        weekday: cn("flex-1 py-2 text-sm font-medium text-muted-foreground select-none", d.weekday),
        week: cn("mt-1 flex w-full", d.week),
        day: cn("group/day relative aspect-square h-auto w-full flex-1 p-0 text-center select-none", d.day),
        today: cn("", d.today),
        outside: cn("text-muted-foreground/50", d.outside),
        disabled: cn("opacity-40", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...p }) => <div data-slot="calendar" ref={rootRef} className={cn(className)} {...p} />,
        Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeftIcon className="size-5" strokeWidth={1.75} /> : <ChevronRightIcon className="size-5" strokeWidth={1.75} />,
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => { if (modifiers.focused) ref.current?.focus() }, [modifiers.focused])
  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected || undefined}
      className={cn(
        "relative mx-auto flex aspect-square w-[min(100%,var(--cell-size))] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-base leading-none font-medium transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring",
        modifiers.today && !modifiers.selected && "ring-2 ring-foreground/20",
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
        className
      )}
      {...props}
    >
      {props.children}
      {modifiers.hasTask && <i aria-hidden="true" className={cn("absolute bottom-1.5 size-1.5 rounded-full", modifiers.selected ? "bg-primary-foreground" : "bg-blue")} />}
    </button>
  )
}

export { Calendar, CalendarDayButton }

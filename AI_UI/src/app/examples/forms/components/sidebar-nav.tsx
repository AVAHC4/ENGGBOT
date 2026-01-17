"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
  }[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:items-start",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted text-primary shadow-sm ring-1 ring-border dark:bg-white/10 dark:text-white dark:ring-white/20"
              : "hover:bg-muted/50 hover:text-foreground hover:underline text-muted-foreground dark:hover:bg-white/5 dark:hover:text-white",
            "justify-start self-start w-auto"
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}

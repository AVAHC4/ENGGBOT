"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

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
        "flex flex-col space-y-1 bg-black/90 rounded-lg p-2",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer",
            pathname === item.href
              ? "bg-gray-800 text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-800",
            item.title === "Profile" && pathname !== item.href && "text-gray-300 hover:text-white hover:bg-gray-800"
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
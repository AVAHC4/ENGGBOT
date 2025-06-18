import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "./components/sidebar-nav"

const sidebarNavItems = [
  {
    title: "Profile",
    href: "/examples/forms/profile",
  },
  {
    title: "Account",
    href: "/examples/forms/account",
  },
  {
    title: "Appearance",
    href: "/examples/forms/appearance",
  },
  {
    title: "Notifications",
    href: "/examples/forms/notifications",
  },
  {
    title: "Display",
    href: "/examples/forms/display",
  },
]

export default function FormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6 p-10 pb-16 bg-white text-black dark:bg-black dark:text-white min-h-screen">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Forms</h2>
        <p className="text-muted-foreground">
          Examples of form components built with shadcn/ui.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
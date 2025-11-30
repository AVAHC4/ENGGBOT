"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "./components/sidebar-nav"
import { useLanguage } from "@/context/language-context"

interface SettingsLayoutContentProps {
    children: React.ReactNode
}

export function SettingsLayoutContent({ children }: SettingsLayoutContentProps) {
    const { t } = useLanguage()

    const sidebarNavItems = [
        {
            title: t('settings.profile'),
            href: "/examples/forms",
        },
        {
            title: t('settings.account'),
            href: "/examples/forms/account",
        },
        {
            title: t('settings.appearance'),
            href: "/examples/forms/appearance",
        },
        {
            title: t('settings.notifications'),
            href: "/examples/forms/notifications",
        },
        {
            title: t('settings.display'),
            href: "/examples/forms/display",
        },
    ]

    return (
        <>
            <div className="hidden space-y-6 p-10 pb-16 md:block">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
                    <p className="text-muted-foreground">
                        {t('settings.description')}
                    </p>
                </div>
                <Separator className="my-6" />
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:w-1/5">
                        <SidebarNav items={sidebarNavItems} />
                    </aside>
                    <div className="flex-1 lg:max-w-2xl max-h-[calc(100vh-13rem)] overflow-y-auto pr-4">{children}</div>
                </div>
            </div>
        </>
    )
}

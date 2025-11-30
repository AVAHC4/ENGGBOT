import { Metadata } from "next"
import { SettingsLayoutContent } from "./settings-layout-content"

export const metadata: Metadata = {
  title: "Forms",
  description: "Advanced form example using react-hook-form and Zod.",
}

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <SettingsLayoutContent>{children}</SettingsLayoutContent>
}

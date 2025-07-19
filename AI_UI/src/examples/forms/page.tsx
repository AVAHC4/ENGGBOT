import { redirect } from "next/navigation"

export default function FormsPage() {
  redirect("/examples/forms/profile")
  return null // This will never be reached due to redirect
}
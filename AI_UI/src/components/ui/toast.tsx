import { toast as sonnerToast } from "sonner"

export type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
}

export type ToastActionElement = React.ReactElement

export function toast({ title, description, variant = "default" }: ToastProps) {
  sonnerToast(title, {
    description,
    className: variant,
  })
} 
import { DisplayForm } from "./display-form"

export default function DisplayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Display</h3>
        <p className="text-sm text-muted-foreground">
          Configure how the app looks and behaves.
        </p>
      </div>
      <DisplayForm />
    </div>
  )
}
import { ProfileForm } from "@/examples/forms/profile-form"

export default function ExamplesFormsProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Update your personal profile information.
        </p>
      </div>
      <ProfileForm />
    </div>
  )
} 
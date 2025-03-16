
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ContentSection() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Beautifully designed components <br className="hidden sm:inline" />
          built with Radix UI and Tailwind CSS.
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Accessible and customizable components that you can copy and paste into
          your apps. Free. Open Source. And Next.js 13 Ready.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/docs">
          <Button variant="default" size="lg">
            Documentation
          </Button>
        </Link>
        <Link href="/components">
          <Button variant="outline" size="lg">
            Components
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Style</h3>
            <p>Styles for headings, paragraphs, lists, and more.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Components</h3>
            <p>Buttons, menu, dialog, and more.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Documentation</h3>
            <p>Full documentation and getting started guide.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

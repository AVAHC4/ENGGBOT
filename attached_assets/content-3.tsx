
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

export default function ContentSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
        <div className="grid gap-8 md:grid-cols-2">
          <img
            className="rounded-(--radius) grayscale"
            src="https://images.unsplash.com/photo-1530099486328-e021101a494a?q=80&w=2747&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Engineering team collaboration"
            loading="lazy"
          />
          <img
            className="rounded-(--radius) grayscale"
            src="/attached_assets/image_1742139682286.png"
            alt="AI chat interface"
            loading="lazy"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            Advanced Engineering Assistant Powered by AI Technology
          </h2>
          <div className="space-y-6">
            <p>
              Our engineering assistant goes beyond basic calculations. It provides comprehensive support for complex engineering problems, 
              technical documentation, and project optimization - all powered by state-of-the-art AI models designed specifically for engineering applications.
            </p>

            <Button asChild variant="secondary" size="sm" className="gap-1 pr-1.5">
              <Link href="#">
                <span>Explore Features</span>
                <ChevronRight className="size-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}


import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { Link } from "wouter"

export default function ContentSection() {
  return (
    <section className="py-8 md:py-16">
      <div className="mx-auto max-w-5xl space-y-6 px-6 md:space-y-8">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            The Lyra ecosystem brings together our models, products and platforms.
          </h2>
          <div className="space-y-6">
            <p>
              Lyra is evolving to be more than just the models. It supports an entire ecosystem — from products to the
              APIs and platforms helping developers and businesses innovate.
            </p>

            <Button asChild variant="secondary" size="sm" className="gap-1 pr-1.5">
              <Link href="#">
                <span>Learn More</span>
                <ChevronRight className="size-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export default function ContentSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
        <img
          className="rounded-(--radius) grayscale"
          src="https://images.unsplash.com/photo-1530099486328-e021101a494a?q=80&w=2747&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="team image"
          height=""
          width=""
          loading="lazy"
        />

        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            The ENGGBOT ecosystem brings together cutting-edge AI, university resources, and student innovation.
          </h2>
          <div className="space-y-6">
            <p>
              ENGGBOT is evolving to be more than just a chatbot. It supports an entire ecosystem — from lecture notes and course materials to APIs and platforms, empowering students and educators to enhance learning and academic success.
            </p>

            <Button asChild variant="secondary" size="sm" className="gap-1 pr-1.5">
              <a href="#">
                <span>Learn More</span>
                <ChevronRight className="size-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
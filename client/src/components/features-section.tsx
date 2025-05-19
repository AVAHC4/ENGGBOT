import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from "lucide-react"

export default function Features() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-2xl space-y-6 text-center md:space-y-12">
          <h2 className="text-balance text-4xl font-medium lg:text-5xl leading-tight whitespace-pre-line">
            {'The Foundation for academic excellence and student success'}
          </h2>
          <p>
          ENGGBOT is evolving to be more than just a chatbot. It supports an entire ecosystem — from course materials to AI-driven tools, empowering students and educators to achieve their academic goals.
          </p>
        </div>

        <div className="relative mx-auto grid max-w-4xl divide-x divide-y border *:p-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="size-4" />
              <h3 className="text-sm font-medium"><strong>Instant Answers</strong></h3>
            </div>
            <p className="text-sm">Get explanations sourced directly from professors' notes, slides, and textbooks in seconds.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="size-4" />
              <h3 className="text-sm font-medium"><strong>Faculty-Validated Content</strong></h3>
            </div>
            <p className="text-sm">All answers are cross-checked with university materials to ensure accuracy.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="size-4" />

              <h3 className="text-sm font-medium"><strong>Privacy-first Design</strong></h3>
            </div>
            <p className="text-sm">No personal data collection. Your queries and history remain confidential.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pencil className="size-4" />

              <h3 className="text-sm font-medium"><strong>Multilingual Support</strong></h3>
            </div>
            <p className="text-sm">Ask questions in English, Hindi, Telugu, or Tamil for seamless understanding.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4" />

              <h3 className="text-sm font-medium"><strong>Exam Prep Tools</strong></h3>
            </div>
            <p className="text-sm">Access interactive past papers and quizzes to test your knowledge.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />

              <h3 className="text-sm font-medium"><strong>Open-Source Ecosystem</strong></h3>
            </div>
            <p className="text-sm">Built with free, customizable tools like LangChain and Mistral-7B for transparency and scalability.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
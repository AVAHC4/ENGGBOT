import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedGroup } from "@/components/motion-primitives/animated-group"

export default function ContentSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="overflow-hidden rounded-3xl relative shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent z-10 pointer-events-none" />
          <motion.img
            initial={{ filter: "blur(10px)", scale: 1.1 }}
            whileInView={{ filter: "blur(0px)", scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full h-[400px] md:h-[500px] object-cover"
            src="https://images.unsplash.com/photo-1530099486328-e021101a494a?q=80&w=2747&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="team image"
            loading="lazy"
          />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-12 pt-8">
          <motion.h2 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="text-4xl font-medium"
          >
            The ENGGBOT ecosystem brings together cutting-edge AI, university resources, and student innovation.
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.2 }}
            className="space-y-6"
          >
            <p className="text-muted-foreground leading-relaxed text-lg">
              ENGGBOT is evolving to be more than just a chatbot. It supports an entire ecosystem — from lecture notes and course materials to APIs and platforms, empowering students and educators to enhance learning and academic success.
            </p>

            <motion.div whileHover={{ scale: 1.05, x: 5 }} whileTap={{ scale: 0.95 }} className="w-fit">
              <Button asChild variant="secondary" size="lg" className="gap-2 rounded-full px-6 transition-colors hover:bg-primary hover:text-primary-foreground group">
                <a href="#">
                  <span className="font-semibold text-base">Learn More</span>
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
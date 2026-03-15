import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { type: "spring", bounce: 0.4, duration: 1 } 
  }
}

export default function Features() {
  const features = [
    {
      icon: <Zap className="size-5 text-blue-500" />,
      title: "Instant Answers",
      description: "Get explanations sourced directly from professors' notes, slides, and textbooks in seconds."
    },
    {
      icon: <Cpu className="size-5 text-purple-500" />,
      title: "Faculty-Validated Content",
      description: "All answers are cross-checked with university materials to ensure accuracy."
    },
    {
      icon: <Fingerprint className="size-5 text-emerald-500" />,
      title: "Privacy-First Design",
      description: "No personal data collection. Your queries and history remain confidential."
    },
    {
      icon: <Pencil className="size-5 text-amber-500" />,
      title: "Multilingual Support",
      description: "Ask questions in English, Hindi, Telugu, or Tamil for seamless understanding."
    },
    {
      icon: <Settings2 className="size-5 text-pink-500" />,
      title: "Exam Prep Tools",
      description: "Access interactive past papers and quizzes to test your knowledge."
    },
    {
      icon: <Sparkles className="size-5 text-indigo-500" />,
      title: "Open-Source Ecosystem",
      description: "Built with free, customizable tools like LangChain and Mistral-7B for transparency and scalability."
    }
  ]

  return (
    <section className="py-16 md:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-6xl space-y-12 px-6 md:space-y-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
          className="mx-auto max-w-3xl text-center space-y-6"
        >
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
            The Foundation for academic excellence and student success
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            ENGGBOT is evolving to be more than just a chatbot. It supports an entire ecosystem — from course materials to AI-driven tools, empowering students and educators to achieve their academic goals.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mx-auto"
        >
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03, 
                y: -5,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              className="group relative overflow-hidden rounded-3xl border bg-background p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/20 dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.05)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <div className="relative z-10 space-y-4">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-muted/50 group-hover:bg-background transition-colors shadow-sm border border-transparent group-hover:border-border">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
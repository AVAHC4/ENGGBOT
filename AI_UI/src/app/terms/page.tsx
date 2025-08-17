'use client'

import { useRef } from 'react'
import { ScrollProgress } from '@/components/ui/scroll-progress'

export default function TermsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      {/* Progress bar fixed to the top */}
      <ScrollProgress className="fixed left-0 right-0 top-0 z-50 bg-primary" containerRef={containerRef} />

      <div className="mx-auto w-full max-w-4xl px-6 pt-10 pb-24">
        <h1 className="mb-6 text-3xl font-bold">Terms and Conditions</h1>
        <p className="text-muted-foreground">
          Please read these Terms and Conditions carefully before using this application.
        </p>
      </div>

      {/* Scrollable content container tracked by ScrollProgress */}
      <div
        ref={containerRef}
        className="mx-auto w-full max-w-4xl overflow-y-auto px-6 pb-24"
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
      >
        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            These Terms and Conditions ("Terms") govern your use of our services. By accessing or using the
            application, you agree to be bound by these Terms.
          </p>
          <p>
            The content below is placeholder text to demonstrate scrolling behavior with the progress bar at the top.
          </p>
        </section>

        {Array.from({ length: 12 }).map((_, i) => (
          <section key={i} className="space-y-4 pb-10">
            <h3 className="text-lg font-semibold">Section {i + 2}</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor,
              dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas
              ligula massa, varius a, semper congue, euismod non, mi.
            </p>
            <p>
              Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.
              Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue.
            </p>
            <p>
              Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede.
              Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis
              in faucibus orci luctus et ultrices posuere cubilia curae.
            </p>
          </section>
        ))}

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us.
          </p>
        </section>
      </div>
    </div>
  )
}

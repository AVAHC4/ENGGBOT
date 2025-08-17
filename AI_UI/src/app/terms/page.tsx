'use client'

import { useRef } from 'react'
import { ScrollProgress } from '@/components/ui/scroll-progress'

export default function TermsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      {/* Progress bar fixed to the top */}
      <ScrollProgress className="fixed left-0 right-0 top-0 z-50 bg-primary" containerRef={containerRef} />

      <div className="mx-auto w-full max-w-4xl px-6 pt-0 pb-0">
        <h1 className="mb-0 text-3xl font-bold">Terms and Conditions</h1>
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
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Service ("Service"), you agree to these Terms and our Privacy Policy. If you do not agree,
            do not use the Service.
          </p>
          <p>
            These Terms constitute a binding agreement between you and ENGGBOT. Please review them regularly as we
            may update them from time to time. If you are using the Service on behalf of an organization, you represent that you
            have authority to bind that organization to these Terms.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">2. Eligibility</h2>
          <p>
            You must be legally capable of entering into a binding contract and meet the minimum age of digital consent in your
            jurisdiction.
          </p>
          <p>
            If you are under the age of majority, you may only use the Service with the consent and supervision of a parent or
            legal guardian. You must not use the Service if you are barred from doing so under applicable law.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">3. Accounts and Security</h2>
          <p>
            You are responsible for your account, credentials, and all activity under your account. Notify us promptly at
            crashcourse3879@gmail.com of any unauthorized access or security incident.
          </p>
          <p>
            You must keep your registration information accurate and up to date and implement reasonable measures to secure your
            device and account. We may require identity or ownership verification and may suspend access pending investigation of
            suspected compromise or misuse.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">4. User Content</h2>
          <p>
            You retain ownership of content you submit ("User Content"). You grant us a worldwide, non-exclusive, royalty-free
            license to host, process, and display User Content solely to operate and improve the Service. You represent you have
            necessary rights and that your User Content complies with law and does not infringe third-party rights.
          </p>
          <p>
            You are solely responsible for your User Content. We may remove or disable access to any User Content that we believe
            violates these Terms or applicable law. Please maintain backups; we do not guarantee retention of User Content.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
          <p>
            You agree not to engage in unlawful, harmful, deceptive, or abusive activity; interfere with or disrupt the Service;
            attempt to bypass security; upload malware or illegal/infringing content; or misuse the Service for cheating, academic
            misconduct, or spam.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>No automated scraping, rate abuse, or denial-of-service attacks.</li>
            <li>No attempts to access data or systems without authorization.</li>
            <li>No impersonation, misrepresentation, or deceptive conduct.</li>
            <li>No content that is unlawful, defamatory, or violates privacy or IP rights.</li>
          </ul>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">6. Generated Outputs</h2>
          <p>
            The Service may produce automated or generated outputs that can be inaccurate or incomplete and are provided for
            informational purposes only, not as professional advice. You are responsible for how you use such outputs.
          </p>
          <p>
            Generated outputs do not constitute medical, legal, financial, or other professional advice. Always verify critical
            information from independent sources before relying on it or taking action.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
          <p>
            The Service, including software, features, design, and trademarks, is owned by us or our licensors and protected by
            law. Except as permitted by these Terms or applicable law, you may not copy, modify, or create derivative works.
          </p>
          <p>
            You must not remove proprietary notices, circumvent technical protections, frame or mirror the Service, or use it to
            build a competing product or service.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">8. Fees and Subscriptions</h2>
          <p>
            If paid features are offered, pricing, billing, and refund terms will be presented at purchase. Applicable taxes may
            apply. Cancellations take effect at the end of the current billing period unless otherwise stated.
          </p>
          <p>
            We may change prices or introduce new charges with notice as required by law. You authorize us (or our processor) to
            charge your payment method for applicable fees and taxes. Chargebacks may result in account suspension.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">9. Third-Party Services</h2>
          <p>
            The Service may interoperate with third-party services. We are not responsible for their content, policies, or
            practices. Your use of third-party services may be governed by their terms and privacy policies.
          </p>
          <p>
            Where necessary to enable functionality, we may exchange limited information with third parties. Your data will be
            handled in accordance with our Privacy Policy and applicable law.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">10. Privacy</h2>
          <p>
            We process personal data as described in our Privacy Policy, including account and technical information necessary to
            provide and secure the Service. Do not submit sensitive data unless strictly necessary.
          </p>
          <p>
            For details, please review our Privacy Policy at [Privacy Policy URL]. If you have questions about how we process your
            information, contact us at [Contact Email].
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">11. Availability and Changes</h2>
          <p>
            We may modify, suspend, or discontinue the Service or any feature at any time. Beta or experimental features are
            provided "as is" and may change without notice.
          </p>
          <p>
            The Service may experience occasional outages for maintenance or updates. We may impose usage or storage limits to
            maintain performance and reliability.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">12. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available," without warranties of any kind, whether express or implied,
            including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant uninterrupted or
            error-free operation or the accuracy of generated outputs.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties; to that extent, the above exclusions may not
            apply to you. Your statutory rights, if any, are not affected.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we will not be liable for indirect, incidental, special, consequential,
            punitive, or exemplary damages, or any loss of profits, data, or goodwill. Our aggregate liability arising out of or
            relating to the Service will not exceed the greater of USD 100 or the amounts you paid (if any) in the 12 months
            preceding the claim.
          </p>
          <p>
            Some jurisdictions do not allow the limitation or exclusion of liability for incidental or consequential damages; to
            that extent, the above limitation may not apply to you.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">14. Indemnification</h2>
          <p>
            You agree to indemnify and hold us harmless from claims, damages, losses, liabilities, costs, and expenses (including
            reasonable attorneys' fees) arising from your use of the Service, your User Content, or your violation of these Terms
            or applicable law.
          </p>
          <p>
            We may, at our discretion, assume the exclusive defense and control of any matter otherwise subject to indemnification
            by you. In that case, you agree to cooperate with our defense of such claims.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">15. Termination</h2>
          <p>
            We may suspend or terminate access to the Service at any time, with or without notice, including for violations of
            these Terms. Upon termination, your right to use the Service ceases immediately. Sections intended to survive
            termination will survive.
          </p>
          <p>
            We may also remove or disable access to content associated with your account, subject to applicable law. Your ongoing
            obligations under these Terms (including IP, disclaimers, limitations of liability, and indemnities) will survive.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">16. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of [Jurisdiction], without regard to conflict-of-law rules. You consent to the
            exclusive jurisdiction and venue of courts located in [Venue], unless otherwise required by applicable law.
          </p>
          <p>
            If any provision of these Terms is found unenforceable, that provision will be enforced to the maximum extent
            permissible, and the remaining provisions will remain in full force and effect.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">17. Changes to Terms</h2>
          <p>
            We may update these Terms by posting a revised version with a new "Last Updated" date. Your continued use of the
            Service after changes become effective constitutes acceptance.
          </p>
          <p>
            For material changes, we will provide additional notice where required by law. Please review these Terms periodically
            to stay informed.
          </p>
        </section>

        <section className="space-y-4 pb-10">
          <h2 className="text-xl font-semibold">18. Contact</h2>
          <p>
            Questions about these Terms: ENGGBOT, crashcourse3879@gmail.com.
          </p>
          <p>
            We aim to respond to inquiries within a reasonable timeframe, but response times may vary.
          </p>
        </section>

        <p className="pb-10 text-sm text-muted-foreground">Last Updated: 2025-08-17</p>
      </div>
    </div>
  )
}

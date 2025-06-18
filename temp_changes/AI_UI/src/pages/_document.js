import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        {/* Hide Vercel badge specifically */}
        <style jsx global>{`
          /* Hide Vercel deployment badge (N logo) */
          .vercel-badge {
            display: none !important;
          }
          
          /* Hide any fixed positioned elements in the bottom right corner */
          div[style*="position:fixed"][style*="bottom:0"][style*="right:0"] {
            display: none !important;
          }
          
          /* Target the N logo specifically by common class patterns */
          div[style*="z-index:9999"] {
            display: none !important;
          }
        `}</style>
      </body>
    </Html>
  )
} 
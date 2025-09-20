import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "wouter"
import { AnimatedGroup } from "@/components/motion-primitives/animated-group"
import { TextEffect } from "@/components/motion-primitives/text-effect"
import BackgroundPaths from "@/components/background-paths"
import BeamsBackground from "@/components/beams-background"

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

export default function SignUpPage() {
  const handleGoogleSignIn = () => {
    // Create an anchor element to navigate properly
    const a = document.createElement('a');
    a.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
    a.target = "_self"; // Important: use _self to avoid popup blockers
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen relative">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div className="block dark:hidden" style={{ position: 'absolute', inset: 0 }}>
          <BackgroundPaths />
        </div>
        <div className="hidden dark:block" style={{ position: 'absolute', inset: 0 }}>
          <BeamsBackground intensity="medium" />
        </div>
      </div>

      {/* Home Button */}
      <Link href="/" className="absolute top-6 left-6 z-20">
        <button className="px-4 py-2 rounded-md bg-white dark:bg-black text-black dark:text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-800">
          Home
        </button>
      </Link>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 md:py-32">
        <AnimatedGroup variants={transitionVariants}>
          <form
            className="m-auto h-fit w-full max-w-[440px] overflow-hidden rounded-[14px] border border-gray-200 dark:border-gray-700 shadow-md shadow-zinc-950/5 bg-white dark:bg-zinc-900"
          >
            <div className="bg-card -m-px rounded-[14px] border border-gray-200 dark:border-gray-700 p-12 pb-10">
              <div className="text-center">
                <Link href="/" aria-label="go home" className="mx-auto block w-fit">
                  <div className="flex items-center space-x-2">
                    <Logo />
                    <span className="text-2xl font-bold">ENGGBOT</span>
                  </div>
                </Link>
                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="text-title mb-1 mt-4 text-xl font-semibold"
                >
                  Create a ENGGBOT Account
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="text-sm"
                >
                  Welcome! Create an account to get started
                </TextEffect>
              </div>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstname" className="block text-sm">
                      Firstname
                    </Label>
                    <Input type="text" required name="firstname" id="firstname" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastname" className="block text-sm">
                      Lastname
                    </Label>
                    <Input type="text" required name="lastname" id="lastname" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="block text-sm">
                    Email 
                  </Label>
                  <Input type="email" required name="email" id="email" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd" className="text-title text-sm">
                      Password
                    </Label>
                    <Button asChild variant="link" size="sm">
                      <Link href="#" className="link intent-info variant-ghost text-sm">
                        Forgot your Password?
                      </Link>
                    </Button>
                  </div>
                  <Input type="password" required name="pwd" id="pwd" className="input sz-md variant-mixed" />
                </div>

                <Button className="w-full">Sign Up</Button>
              </div>

              <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <hr className="border-dashed border-gray-300 dark:border-gray-600" />
                <span className="text-muted-foreground text-xs">Or continue With</span>
                <hr className="border-dashed border-gray-300 dark:border-gray-600" />
              </div>

              <div className="w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // Use the global function we defined in index.html
                    (window as any).showGoogleAuth();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="0.98em" height="1em" viewBox="0 0 256 262" className="mr-2">
                    <path
                      fill="#4285f4"
                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    ></path>
                    <path
                      fill="#34a853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    ></path>
                    <path
                      fill="#fbbc05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                    ></path>
                    <path
                      fill="#eb4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    ></path>
                  </svg>
                  <span>Google</span>
                </Button>
              </div>
            </div>

            <div className="p-3 bg-card border-t">
              <p className="text-accent-foreground text-center text-sm">
                Have an account?
                <Button asChild variant="link" className="px-2 text-black dark:text-white">
                  <Link href="/login">Sign In</Link>
                </Button>
              </p>
            </div>
          </form>
        </AnimatedGroup>
      </section>
    </div>
  )
} 
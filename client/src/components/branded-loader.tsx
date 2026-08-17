import { Logo } from "@/components/logo";

type BrandedLoaderProps = {
  message: string;
  detail?: string;
  className?: string;
};

/** A compact, logo-first loading treatment used while moving between Enggbot apps. */
export function BrandedLoader({ message, detail, className = "" }: BrandedLoaderProps) {
  return (
    <div
      className={`enggbot-loader flex flex-col items-center text-center text-white ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="enggbot-loader__mark" aria-hidden="true">
        <span className="enggbot-loader__halo enggbot-loader__halo--outer" />
        <span className="enggbot-loader__halo enggbot-loader__halo--inner" />
        <span className="enggbot-loader__orbit" />
        <Logo className="enggbot-loader__logo" />
      </div>
      <div className="mt-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
        Enggbot
      </div>
      <p className="mt-3 text-xl font-medium tracking-tight text-zinc-100 sm:text-2xl">{message}</p>
      {detail && <p className="mt-2 text-sm text-zinc-500">{detail}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}

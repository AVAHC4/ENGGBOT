import { Skeleton } from "@/components/ui/skeleton"

export function HeroSectionSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header Skeleton */}
      <div className="fixed z-20 w-full px-2">
        <div className="mx-auto mt-2 max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <Skeleton className="h-8 w-24" />
            <div className="hidden lg:flex space-x-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
            <div className="flex space-x-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Content Skeleton */}
      <div className="relative pt-24 md:pt-36">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <Skeleton className="mx-auto h-8 w-64 mb-8" />
            <Skeleton className="mx-auto h-16 w-[80%] max-w-3xl mb-6" />
            <Skeleton className="mx-auto h-16 w-[60%] max-w-2xl mb-8" />
            <Skeleton className="mx-auto h-6 w-[90%] max-w-xl mb-12" />
            
            <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
              <Skeleton className="h-14 w-40" />
              <Skeleton className="h-14 w-32" />
            </div>
          </div>
        </div>

        {/* Interface Preview Skeleton */}
        <div className="mt-16">
          <Skeleton className="mx-auto aspect-[16/9] max-w-6xl rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

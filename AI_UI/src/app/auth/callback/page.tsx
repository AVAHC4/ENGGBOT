"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // With detectSessionInUrl: true, this will parse tokens from the URL hash
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setError(error.message);
          return;
        }
        // Small delay to ensure session is stored
        setTimeout(() => router.replace("/chat"), 50);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Authentication failed");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) router.replace("/chat");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Finishing sign-in...</p>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>
    </main>
  );
}

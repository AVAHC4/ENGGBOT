"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) setError(error.message);
    } catch (e: any) {
      setError(e?.message || "Failed to start Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">Use your Google account to continue</p>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
        {error ? (
          <p className="text-sm text-red-500 text-center">{error}</p>
        ) : null}
      </div>
    </main>
  );
}

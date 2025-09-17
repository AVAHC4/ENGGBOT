"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">ENGGBOT — Your AI Study Assistant</h1>
        <p className="text-muted-foreground text-lg">
          Ask questions, analyze documents, and learn faster. Secure, accurate, and delightful.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-white font-medium hover:opacity-90"
          >
            Sign in to get started
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-md border px-6 py-3 font-medium hover:bg-accent"
          >
            {hasSession ? "Go to Chat" : "Try Chat (will prompt login)"}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="rounded-lg border p-4 text-left">
            <h3 className="font-semibold mb-1">Accurate Answers</h3>
            <p className="text-sm text-muted-foreground">Grounded in your course materials and notes.</p>
          </div>
          <div className="rounded-lg border p-4 text-left">
            <h3 className="font-semibold mb-1">Voice & Text</h3>
            <p className="text-sm text-muted-foreground">Speak or type — transcribe with low-latency.</p>
          </div>
          <div className="rounded-lg border p-4 text-left">
            <h3 className="font-semibold mb-1">Zero Server Setup</h3>
            <p className="text-sm text-muted-foreground">Hosted free on Vercel with serverless APIs.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

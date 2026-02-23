"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function OnboardingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnToPublish = searchParams.get("return") === "publish";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin?callbackUrl=/onboarding");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.profile) {
          router.replace(returnToPublish ? "/history?pendingPublish=1" : "/history");
        }
      })
      .catch(() => {});
  }, [status, returnToPublish, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setError("3-20 characters, letters, numbers, underscores only");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create profile");
        setLoading(false);
        return;
      }
      router.replace(returnToPublish ? "/history?pendingPublish=1" : "/history");
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Create your profile
        </h1>
        <p className="text-gray-400 mb-8">Choose a username to publish to the leaderboard</p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1rem",
            padding: "1.5rem",
          }}
        >
          <div>
            <label className="block text-sm font-mono text-text-muted uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="founder_42"
              className="w-full px-4 py-3 rounded-lg font-mono bg-black/30 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
              maxLength={20}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-red-400 font-mono text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-mono text-sm tracking-[0.15em] uppercase font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: "rgba(0,245,255,0.1)",
              border: "1px solid rgba(0,245,255,0.3)",
              color: "#00F5FF",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

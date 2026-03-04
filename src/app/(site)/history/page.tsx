"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import { toScore100 } from "@/lib/score";

interface PitchRow {
  id: string;
  created_at: string;
  agent: string;
  overall_score: number;
  duration_seconds: number | null;
  top_weakness: string | null;
  rewritten_opener: string | null;
  improved_answer: string | null;
  transcript: unknown;
}

const AGENT_NAMES: Record<string, string> = {
  marcus: "Marcus Chen",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTranscript(
  t: unknown
): Array<{ speaker: string; text: string }> | null {
  if (Array.isArray(t)) return t;
  if (typeof t === "string" && t) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function PitchCard({ pitch }: { pitch: PitchRow }) {
  const [expanded, setExpanded] = useState(false);
  const transcript = parseTranscript(pitch.transcript);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-text-muted">
              <Calendar className="w-4 h-4" />
              <span className="font-mono text-sm">{formatDate(pitch.created_at)}</span>
            </div>
            <span className="text-cyan-400 font-mono text-sm">
              {AGENT_NAMES[pitch.agent] || pitch.agent}
            </span>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-cyan-400">{toScore100(pitch.overall_score)}/100</span>
            </div>
            <span className="font-mono text-xs text-text-muted">
              {formatDuration(pitch.duration_seconds)}
            </span>
          </div>
          {transcript && transcript.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs uppercase tracking-wider"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Hide transcript
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Transcript
                </>
              )}
            </button>
          )}
        </div>

        <AnimatePresence>
          {expanded && transcript && transcript.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transcript.map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs font-mono text-text-muted w-16 shrink-0">
                      {entry.speaker}:
                    </span>
                    <span className="text-sm text-foreground/80">{entry.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pitch.top_weakness && (
          <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(255,59,92,0.06)" }}>
            <p className="text-[10px] font-mono tracking-wider text-red-400 uppercase mb-1">
              Top weakness
            </p>
            <p className="text-sm text-foreground/80">{pitch.top_weakness}</p>
          </div>
        )}
        {pitch.rewritten_opener && (
          <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(0,245,255,0.04)" }}>
            <p className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase mb-1">
              Rewritten opener
            </p>
            <p className="text-sm text-foreground/80">{pitch.rewritten_opener}</p>
          </div>
        )}
        {pitch.improved_answer && (
          <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(0,255,178,0.04)" }}>
            <p className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase mb-1">
              Better answer
            </p>
            <p className="text-sm text-foreground/80">{pitch.improved_answer}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HistoryContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pitches, setPitches] = useState<PitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin?callbackUrl=/history");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const hasPending = searchParams.get("pendingPublish") === "1";
    if (!hasPending) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && !d.profile) {
            router.replace("/onboarding?return=history");
          }
        })
        .catch(() => {});
    }

    const pending = sessionStorage.getItem("voicepitch:pendingPublish");
    if (pending && searchParams.get("pendingPublish") === "1") {
      setPublishing(true);
      sessionStorage.removeItem("voicepitch:pendingPublish");
      const payload = JSON.parse(pending);
      fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then(() => {
          setPublishing(false);
          fetchPitches();
        })
        .catch(() => setPublishing(false));
      return;
    }

    fetchPitches();
  }, [status, searchParams]);

  const fetchPitches = () => {
    fetch("/api/pitches/mine")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.pitches)) setPitches(d.pitches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#050505] pt-24 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Your Pitch History
        </h1>
        <p className="text-gray-400 mb-8">Private record of your published pitches</p>

        {publishing && (
          <div className="mb-6 flex items-center gap-2 text-cyan-400 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Publishing your last pitch…
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : pitches.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-gray-400 mb-4">No pitches yet</p>
            <Link
              href="/pitch/select"
              className="inline-block px-6 py-3 rounded-lg font-mono text-sm tracking-wider uppercase"
              style={{
                background: "rgba(0,245,255,0.1)",
                border: "1px solid rgba(0,245,255,0.3)",
                color: "#00F5FF",
              }}
            >
              Start a Pitch
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pitches.map((p) => (
              <PitchCard key={p.id} pitch={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#050505] pt-24 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    }>
      <HistoryContent />
    </Suspense>
  );
}

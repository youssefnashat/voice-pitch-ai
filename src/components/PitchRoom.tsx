"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession as useAuthSession, signIn } from "next-auth/react";
import { useSession } from "@/hooks/useSession";
import { Scorecard as ScorecardType } from "@/types";
import { MarcusAvatar } from "./MarcusAvatar";
import { StatusHUD } from "./StatusHUD";
import { LiveDeckFeed } from "./LiveDeckFeed";
import { TranscriptPanel } from "./TranscriptPanel";
import { UserCamera } from "./UserCamera";
import { YcScorecardModal, type PublishState } from "./YcScorecardModal";

const ANIMATION = {
  pageTransition: 0.4,
  staggerDelay: 0.06,
  microInteraction: 0.15,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION.staggerDelay,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: ANIMATION.pageTransition },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: ANIMATION.pageTransition },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: ANIMATION.pageTransition },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.3 },
  },
};

export function PitchRoom() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent") || "marcus";

  const { data: authSession, status: authStatus } = useAuthSession();
  const session = useSession();
  const [scorecard, setScorecard] = useState<ScorecardType | null>(null);
  const [showRoom, setShowRoom] = useState(false);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishError, setPublishError] = useState<string | undefined>();
  const [hasProfile, setHasProfile] = useState(false);

  const pendingPublishRef = useRef(false);

  const isLoggedIn = authStatus === "authenticated" && !!authSession?.user;

  useEffect(() => {
    if (isLoggedIn) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => setHasProfile(!!(d.ok && d.profile?.username)))
        .catch(() => setHasProfile(false));
    } else {
      setHasProfile(false);
    }
  }, [isLoggedIn]);
  // Auto-end: investor interest dropped below 20%
  useEffect(() => {
    if (session.shouldAutoEnd && !scorecard) {
      handleEndCall();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.shouldAutoEnd]);

  const isProcessing =
    session.sttState === "connecting" || session.ttsState === "synthesizing";
  const isBusy = isProcessing || session.isSpeaking;

  const handleStartPitch = useCallback(async () => {
    setScorecard(null);
    setPublishState("idle");
    setPublishError(undefined);
    setShowRoom(true);
    setTimeout(() => session.startPitch(), 1200);
  }, [session]);

  const handleEndTurn = useCallback(async () => {
    await session.submitTurn();
  }, [session]);

  const handleEndCall = useCallback(async () => {
    const result = await session.endSession();
    if (result) {
      setScorecard(result);
      setScorecardOpen(true);
    }
  }, [session]);

  const handleCloseScorecard = useCallback(() => {
    setScorecardOpen(false);
  }, []);

  const handlePracticeAgain = useCallback(() => {
    setScorecardOpen(false);
    setScorecard(null);
    setPublishState("idle");
    setPublishError(undefined);
    setShowRoom(false);
    session.reset();
  }, [session]);

  const buildPublishPayload = useCallback(() => {
    if (!scorecard) return null;
    const transcriptForStorage = session.transcript.map((e) => ({
      speaker: e.speaker,
      text: e.text,
    }));
    return {
      agent: agentId,
      overall_score: scorecard.overall_score,
      dimensions: scorecard.dimensions ?? {},
      top_weakness: scorecard.top_weakness ?? null,
      rewritten_opener: scorecard.rewritten_opener ?? null,
      improved_answer: scorecard.improved_answer ?? null,
      duration_seconds:
        session.elapsedSeconds != null
          ? Math.round(session.elapsedSeconds)
          : null,
      transcript: transcriptForStorage,
    };
  }, [scorecard, agentId, session.elapsedSeconds, session.transcript]);

  const doPublish = useCallback(async () => {
    if (!scorecard || !authSession?.user) return;

    setPublishState("publishing");
    setPublishError(undefined);

    const payload = buildPublishPayload();
    if (!payload) return;

    try {
      const res = await fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 403 && data?.code === "NO_PROFILE") {
          sessionStorage.setItem("voicepitch:pendingPublish", JSON.stringify(payload));
          window.location.href = "/onboarding?return=publish";
          return;
        }
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      setPublishState("published");
      pendingPublishRef.current = false;
    } catch (err: unknown) {
      console.error("[pitches] publish error:", err);
      setPublishState("error");
      setPublishError(err instanceof Error ? err.message : "Failed to publish. Try again.");
    }
  }, [scorecard, authSession, buildPublishPayload]);

  const handlePublish = useCallback(async () => {
    await doPublish();
  }, [doPublish]);

  const handleSignIn = useCallback(() => {
    pendingPublishRef.current = true;
    signIn();
  }, []);

  const handleNeedsOnboarding = useCallback(() => {
    const payload = buildPublishPayload();
    if (payload) {
      sessionStorage.setItem("voicepitch:pendingPublish", JSON.stringify(payload));
      window.location.href = "/onboarding?return=publish";
    }
  }, [buildPublishPayload]);

  // Auto-publish after login if user clicked "Log in to Publish" before
  useEffect(() => {
    if (
      pendingPublishRef.current &&
      isLoggedIn &&
      scorecard &&
      publishState === "idle"
    ) {
      pendingPublishRef.current = false;
      doPublish();
    }
  }, [isLoggedIn, scorecard, publishState, doPublish]);

  // ── Landing / Pre-pitch View (early return: NO header/End Pitch here) ──
  if (!showRoom && session.phase === "landing") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 245, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center gap-8 text-center px-6"
        >
          <MarcusAvatar
            isSpeaking={false}
            isListening={false}
            isProcessing={false}
          />
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {agentId === "marcus" ? "Marcus Chen" : "Mystery Investor"}
            </h2>
            <p className="text-text-muted text-sm max-w-md">
              Your mic will be activated when you start. Make sure to allow
              microphone access when prompted.
            </p>
          </div>
          <button
            onClick={handleStartPitch}
            className="grain-hover px-10 py-4 rounded-xl font-mono text-sm tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer"
            style={{
              background: "rgba(0, 245, 255, 0.1)",
              border: "1px solid rgba(0, 245, 255, 0.35)",
              color: "#00F5FF",
              boxShadow: "0 0 30px rgba(0, 245, 255, 0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 40px rgba(0, 245, 255, 0.25)";
              e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 30px rgba(0, 245, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.35)";
            }}
          >
            Start Pitch
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Pitch Room View (header renders unconditionally, above all conditionals) ──
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background grid — pointer-events-none so overlays don't block clicks */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 245, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 245, 255, 0.03) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(123, 97, 255, 0.03) 0%, transparent 60%)",
        }}
      />

      {/* ── Top Pitch HUD Header (no global Navbar on pitch routes) ── */}
      <header
        className="sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#050505]/90 backdrop-blur-md border-b border-white/5"
      >
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full border border-border-bright flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-clash-display), serif" }}
          >
            <span className="text-cyan">V</span>
            <span className="text-foreground/80">P</span>
          </span>
        </div>

        <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
          <StatusHUD
            phase={session.phase}
            elapsedSeconds={session.elapsedSeconds}
            interest={session.interestLevel}
          />
          <div className="flex gap-2 shrink-0">
            {session.usingFallbackSTT && (
              <span className="font-mono text-[9px] text-amber-400 tracking-wider">
                STT: Fallback
              </span>
            )}
            {session.usingFallbackTTS && (
              <span className="font-mono text-[9px] text-amber-400 tracking-wider">
                TTS: Fallback
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 w-20" aria-hidden />
      </header>

      <motion.div
        className="relative z-10 flex flex-col flex-1 min-h-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Main Content ── */}
        <div className="flex-1 px-6 pb-6 grid grid-cols-[1fr_320px] gap-5 min-h-0">
          {/* Left: Visualizer + Transcript + Controls */}
          <motion.div
            variants={slideInLeft}
            className="flex flex-col gap-5 min-h-0"
          >
            {/* Video call tiles */}
            <motion.div
              variants={scaleIn}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[360px] md:h-[420px]"
            >
              {/* Marcus tile */}
              <div className="glass-panel rounded-xl flex items-center justify-center relative scanline">
                <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-cyan/40 to-transparent" />
                <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-cyan/40 to-transparent" />
                <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-cyan/40 to-transparent" />
                <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-cyan/40 to-transparent" />
                <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-purple/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-px h-8 bg-gradient-to-t from-purple/30 to-transparent" />
                <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-purple/30 to-transparent" />
                <div className="absolute bottom-0 right-0 w-px h-8 bg-gradient-to-t from-purple/30 to-transparent" />

                <div className="absolute top-4 left-5 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-cyan" />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase">
                    {agentId === "marcus"
                      ? "Marcus Chen"
                      : "Mystery Investor"}{" "}
                    &middot; AI Core
                  </span>
                </div>

                <MarcusAvatar
                  isSpeaking={session.isSpeaking}
                  isListening={session.isListening && !session.isSpeaking}
                  isProcessing={isProcessing}
                />

                <AnimatePresence>
                  {session.marcusThinking !== "idle" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute bottom-4 left-0 right-0 text-center"
                    >
                      <span className="font-mono text-[11px] tracking-wider text-cyan/70">
                        {session.marcusThinking === "thinking"
                          ? "Marcus is thinking..."
                          : "Marcus is still thinking..."}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* You / camera tile */}
              <UserCamera />
            </motion.div>

            {/* Mic error banner */}
            <AnimatePresence>
              {session.sttError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <span className="font-mono text-[11px] tracking-wider">
                    {session.sttError}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Silence warning banner — hidden once pitch has ended */}
            <AnimatePresence>
              {session.silenceWarning &&
                session.isListening &&
                session.phase !== "scorecard" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                    <span className="font-mono text-[11px] tracking-wider">
                      Still listening...
                    </span>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Transcript */}
            <motion.div variants={itemVariants} className="flex-1 min-h-0">
              <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald animate-pulse-glow" />
                  <span className="font-mono text-[10px] tracking-[0.25em] text-emerald uppercase font-bold">
                    Transcript
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TranscriptPanel
                    transcript={session.transcript}
                    isListening={session.isListening}
                    isSilent={false}
                  />
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3"
            >
              <button
                onClick={
                  session.isListening
                    ? handleEndTurn
                    : () => session.startPitch()
                }
                disabled={isBusy}
                className="grain-hover flex-1 min-w-0 py-3.5 rounded-lg font-mono text-xs tracking-[0.15em] uppercase font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: session.isListening
                    ? "rgba(0, 255, 178, 0.1)"
                    : "rgba(0, 245, 255, 0.08)",
                  border: `1px solid ${
                    session.isListening
                      ? "rgba(0, 255, 178, 0.3)"
                      : "rgba(0, 245, 255, 0.2)"
                  }`,
                  color: session.isListening ? "#00FFB2" : "#00F5FF",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.boxShadow = session.isListening
                      ? "0 0 25px rgba(0, 255, 178, 0.15)"
                      : "0 0 25px rgba(0, 245, 255, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {session.isSpeaking
                  ? "Marcus Speaking..."
                  : session.ttsState === "synthesizing"
                  ? "Generating Voice..."
                  : session.isListening
                  ? "Stop & Send"
                  : "Start Speaking"}
              </button>

              <div className="shrink-0 pointer-events-auto">
                <button
                  onClick={handleEndCall}
                  className="grain-hover px-4 py-3.5 rounded-lg font-mono text-xs tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer w-full"
                  style={{
                    background: "rgba(255, 59, 92, 0.08)",
                    border: "1px solid rgba(255, 59, 92, 0.25)",
                    color: "#FF3B5C",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 0 20px rgba(255, 59, 92, 0.15)";
                    e.currentTarget.style.borderColor =
                      "rgba(255, 59, 92, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor =
                      "rgba(255, 59, 92, 0.25)";
                  }}
                >
                  End Pitch
                </button>
              </div>

              <AnimatePresence>
                {session.isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-red-flag"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <span className="font-mono text-[10px] text-red-flag tracking-wider uppercase">
                      Rec
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Right: Live Deck Feed */}
          <motion.div variants={slideInRight} className="min-h-0">
            <LiveDeckFeed transcript={session.transcript} />
          </motion.div>
        </div>
      </motion.div>

      {/* ── YC Scorecard Modal (overlay) ── */}
      {scorecard && (
        <YcScorecardModal
          open={scorecardOpen}
          onClose={handleCloseScorecard}
          scorecard={scorecard}
          isLoggedIn={isLoggedIn}
          hasProfile={hasProfile}
          onPublish={handlePublish}
          onSignIn={handleSignIn}
          onNeedsOnboarding={handleNeedsOnboarding}
          publishState={publishState}
          publishError={publishError}
          onPracticeAgain={handlePracticeAgain}
        />
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Upload, LogIn, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Scorecard as ScorecardType } from "@/types";
import { ScoreBar } from "./ScoreBar";

export type PublishState = "idle" | "publishing" | "published" | "error";

interface YcScorecardModalProps {
  open: boolean;
  onClose: () => void;
  scorecard: ScorecardType;
  isLoggedIn: boolean;
  hasProfile: boolean;
  onPublish: () => Promise<void>;
  onSignIn: () => void;
  onNeedsOnboarding: () => void;
  publishState: PublishState;
  publishError?: string;
  onPracticeAgain: () => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 30,
    scale: 0.97,
    filter: "blur(6px)",
    transition: { duration: 0.25 },
  },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function YcScorecardModal({
  open,
  onClose,
  scorecard,
  isLoggedIn,
  hasProfile,
  onPublish,
  onSignIn,
  onNeedsOnboarding,
  publishState,
  publishError,
  onPracticeAgain,
}: YcScorecardModalProps) {
  const router = useRouter();
  const overallColor =
    scorecard.overall_score >= 7
      ? "#00FFB2"
      : scorecard.overall_score >= 4
      ? "#00F5FF"
      : "#FF3B5C";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop — blocks clicks behind modal */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-2xl mx-4 my-8 md:my-16 rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(12,12,18,0.98) 0%, rgba(8,8,14,0.99) 100%)",
              border: "1px solid rgba(0, 245, 255, 0.12)",
              boxShadow:
                "0 0 80px rgba(0, 245, 255, 0.06), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>

            {/* Content */}
            <motion.div
              className="p-6 md:p-8 space-y-7"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {/* Header */}
              <motion.div variants={fadeUp} className="text-center space-y-4 pt-2">
                <h2
                  className="text-3xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-clash-display), serif" }}
                >
                  <span className="text-cyan">YC</span>{" "}
                  <span className="text-foreground">Scorecard</span>
                </h2>
                <div
                  className="inline-flex items-baseline justify-center gap-1"
                  style={{ color: overallColor }}
                >
                  <span className="text-7xl font-bold font-mono">
                    {scorecard.overall_score}
                  </span>
                  <span className="text-2xl text-text-muted font-mono">/10</span>
                </div>
              </motion.div>

              {/* Dimension Breakdown */}
              <motion.div
                variants={fadeUp}
                className="glass-panel rounded-xl p-6 space-y-5"
              >
                <h3 className="font-mono text-[10px] tracking-[0.25em] text-cyan uppercase font-bold">
                  Dimension Breakdown
                </h3>
                <div className="grid gap-5">
                  <ScoreBar
                    label="Clarity"
                    score={scorecard.dimensions.clarity.score}
                    feedback={scorecard.dimensions.clarity.feedback}
                  />
                  <ScoreBar
                    label="Market"
                    score={scorecard.dimensions.market.score}
                    feedback={scorecard.dimensions.market.feedback}
                  />
                  <ScoreBar
                    label="Traction"
                    score={scorecard.dimensions.traction.score}
                    feedback={scorecard.dimensions.traction.feedback}
                  />
                  <ScoreBar
                    label="Unit Economics"
                    score={scorecard.dimensions.unit_economics.score}
                    feedback={scorecard.dimensions.unit_economics.feedback}
                  />
                  <ScoreBar
                    label="Delivery"
                    score={scorecard.dimensions.delivery.score}
                    feedback={scorecard.dimensions.delivery.feedback}
                  />
                </div>
              </motion.div>

              {/* Top Weakness */}
              {scorecard.top_weakness && (
                <motion.div
                  variants={fadeUp}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(255, 59, 92, 0.05)",
                    border: "1px solid rgba(255, 59, 92, 0.15)",
                  }}
                >
                  <h4 className="font-mono text-[10px] tracking-[0.2em] text-red-flag uppercase font-bold mb-2">
                    Biggest Weakness
                  </h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {scorecard.top_weakness}
                  </p>
                </motion.div>
              )}

              {/* Rewritten Opener */}
              {scorecard.rewritten_opener && (
                <motion.div
                  variants={fadeUp}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(0, 245, 255, 0.04)",
                    border: "1px solid rgba(0, 245, 255, 0.12)",
                  }}
                >
                  <h4 className="font-mono text-[10px] tracking-[0.2em] text-cyan uppercase font-bold mb-2">
                    Rewritten Pitch Opener
                  </h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {scorecard.rewritten_opener}
                  </p>
                </motion.div>
              )}

              {/* Improved Answer */}
              {scorecard.improved_answer && (
                <motion.div
                  variants={fadeUp}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(0, 255, 178, 0.04)",
                    border: "1px solid rgba(0, 255, 178, 0.12)",
                  }}
                >
                  <h4 className="font-mono text-[10px] tracking-[0.2em] text-emerald uppercase font-bold mb-2">
                    Better Answer to Toughest Question
                  </h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {scorecard.improved_answer}
                  </p>
                </motion.div>
              )}

              {/* Publish Error */}
              <AnimatePresence>
                {publishState === "error" && publishError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg"
                    style={{
                      background: "rgba(255, 59, 92, 0.08)",
                      border: "1px solid rgba(255, 59, 92, 0.2)",
                    }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-flag flex-shrink-0" />
                    <span className="text-red-flag font-mono text-[11px] tracking-wider">
                      {publishError}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center gap-3 pt-2 pb-2"
              >
                {/* Return Home */}
                <button
                  onClick={() => router.push("/")}
                  className="grain-hover w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  ← Return Home
                </button>
                {/* Practice Again */}
                <button
                  onClick={onPracticeAgain}
                  className="grain-hover w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Practice Again
                </button>

                {/* Publish / Login */}
                {publishState === "published" ? (
                  <div
                    className="w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(0, 255, 178, 0.08)",
                      border: "1px solid rgba(0, 255, 178, 0.25)",
                      color: "#00FFB2",
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Published
                  </div>
                ) : isLoggedIn && !hasProfile ? (
                  <button
                    onClick={onNeedsOnboarding}
                    className="grain-hover w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(123, 97, 255, 0.08)",
                      border: "1px solid rgba(123, 97, 255, 0.25)",
                      color: "#7B61FF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 0 25px rgba(123, 97, 255, 0.15)";
                      e.currentTarget.style.borderColor =
                        "rgba(123, 97, 255, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "rgba(123, 97, 255, 0.25)";
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Create account to Publish
                  </button>
                ) : isLoggedIn ? (
                  <button
                    onClick={onPublish}
                    disabled={publishState === "publishing"}
                    className="grain-hover w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(123, 97, 255, 0.08))",
                      border: "1px solid rgba(0, 245, 255, 0.3)",
                      color: "#00F5FF",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.boxShadow =
                          "0 0 25px rgba(0, 245, 255, 0.15)";
                        e.currentTarget.style.borderColor =
                          "rgba(0, 245, 255, 0.55)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "rgba(0, 245, 255, 0.3)";
                    }}
                  >
                    {publishState === "publishing" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Publish to Leaderboard
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onSignIn}
                    className="grain-hover w-full sm:flex-1 py-3 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(123, 97, 255, 0.08)",
                      border: "1px solid rgba(123, 97, 255, 0.25)",
                      color: "#7B61FF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 0 25px rgba(123, 97, 255, 0.15)";
                      e.currentTarget.style.borderColor =
                        "rgba(123, 97, 255, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "rgba(123, 97, 255, 0.25)";
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Log in to Publish
                  </button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

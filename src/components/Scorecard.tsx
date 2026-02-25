"use client";

import { motion } from "framer-motion";
import { Scorecard as ScorecardType } from "@/types";
import { ScoreBar } from "./ScoreBar";

interface ScorecardProps {
  scorecard: ScorecardType;
  onPracticeAgain: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function Scorecard({ scorecard, onPracticeAgain }: ScorecardProps) {
  const overallColor =
    scorecard.overall_score >= 7 ? "#00FFB2" : scorecard.overall_score >= 4 ? "#00F5FF" : "#FF3B5C";

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Overall Score */}
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <h2
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-clash-display), serif" }}
        >
          <span className="text-cyan">Pitch</span>{" "}
          <span className="text-foreground">Debrief</span>
        </h2>
        <div
          className="inline-flex items-baseline justify-center gap-1"
          style={{ color: overallColor }}
        >
          <span className="text-7xl font-bold font-mono">{scorecard.overall_score.toFixed(1)}</span>
          <span className="text-2xl text-text-muted font-mono">/10</span>
        </div>
      </motion.div>

      {/* Dimension Scores */}
      <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 space-y-5">
        <h3 className="font-mono text-[10px] tracking-[0.25em] text-cyan uppercase font-bold">
          Dimension Breakdown
        </h3>
        <div className="grid gap-5">
          <ScoreBar label="Clarity" score={scorecard.dimensions.clarity.score} feedback={scorecard.dimensions.clarity.feedback} />
          <ScoreBar label="Market" score={scorecard.dimensions.market.score} feedback={scorecard.dimensions.market.feedback} />
          <ScoreBar label="Traction" score={scorecard.dimensions.traction.score} feedback={scorecard.dimensions.traction.feedback} />
          <ScoreBar label="Unit Economics" score={scorecard.dimensions.unit_economics.score} feedback={scorecard.dimensions.unit_economics.feedback} />
          <ScoreBar label="Delivery" score={scorecard.dimensions.delivery.score} feedback={scorecard.dimensions.delivery.feedback} />
        </div>
      </motion.div>

      {/* Top Weakness */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl p-5"
        style={{
          background: "rgba(255, 59, 92, 0.05)",
          border: "1px solid rgba(255, 59, 92, 0.15)",
        }}
      >
        <h4 className="font-mono text-[10px] tracking-[0.2em] text-red-flag uppercase font-bold mb-2">
          Biggest Weakness
        </h4>
        <p className="text-sm text-foreground/70 leading-relaxed">{scorecard.top_weakness}</p>
      </motion.div>

      {/* Improved Opener */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl p-5"
        style={{
          background: "rgba(0, 245, 255, 0.04)",
          border: "1px solid rgba(0, 245, 255, 0.12)",
        }}
      >
        <h4 className="font-mono text-[10px] tracking-[0.2em] text-cyan uppercase font-bold mb-2">
          Rewritten Pitch Opener
        </h4>
        <p className="text-sm text-foreground/70 leading-relaxed">{scorecard.rewritten_opener}</p>
      </motion.div>

      {/* Improved Answer */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl p-5"
        style={{
          background: "rgba(0, 255, 178, 0.04)",
          border: "1px solid rgba(0, 255, 178, 0.12)",
        }}
      >
        <h4 className="font-mono text-[10px] tracking-[0.2em] text-emerald uppercase font-bold mb-2">
          Better Answer to Toughest Question
        </h4>
        <p className="text-sm text-foreground/70 leading-relaxed">{scorecard.improved_answer}</p>
      </motion.div>

      {/* Practice Again */}
      <motion.div variants={itemVariants} className="text-center pb-8">
        <button
          onClick={onPracticeAgain}
          className="grain-hover px-10 py-4 rounded-lg font-mono text-sm tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(0, 245, 255, 0.05))",
            border: "1px solid rgba(0, 245, 255, 0.3)",
            color: "#00F5FF",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 245, 255, 0.2)";
            e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.3)";
          }}
        >
          Practice Again
        </button>
      </motion.div>
    </motion.div>
  );
}

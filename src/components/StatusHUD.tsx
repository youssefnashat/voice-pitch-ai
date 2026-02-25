"use client";

import { motion } from "framer-motion";
import { Phase } from "@/types";

interface StatusHUDProps {
  phase: Phase;
  elapsedSeconds: number;
  maxSeconds?: number;
  interest: number;
}

const PHASE_LABELS: Record<Phase, string> = {
  landing: "STANDBY",
  pitch: "PITCH",
  qa: "Q&A",
  negotiation: "NEGOTIATION",
  close: "CLOSING",
  scorecard: "DEBRIEF",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function StatusHUD({ phase, elapsedSeconds, maxSeconds = 300, interest }: StatusHUDProps) {
  const timeRemaining = Math.max(0, maxSeconds - elapsedSeconds);
  const timePercent = (timeRemaining / maxSeconds) * 100;
  const isLowTime = timeRemaining < 60;
  // Interest color: red below 20%, yellow 20–60%, cyan/green above 60%
  const interestColor =
    interest < 20
      ? "linear-gradient(90deg, #FF3B5C, #FF6B7F)"
      : interest < 60
      ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
      : "linear-gradient(90deg, #7B61FF, #00F5FF)";

  return (
    <motion.div
      className="glass-panel rounded-lg px-5 py-3 flex items-center gap-6 font-mono text-xs"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
        <span className="text-cyan tracking-[0.2em] text-[10px] font-bold">
          {PHASE_LABELS[phase]}
        </span>
      </div>

      <div className="w-px h-6 bg-border-bright" />

      {/* Time remaining */}
      <div className="flex items-center gap-3">
        <span className="text-text-muted tracking-widest text-[10px] uppercase">Time</span>
        <span className={`tabular-nums tracking-wider font-bold ${isLowTime ? "text-red-flag" : "text-foreground"}`}>
          {formatTime(timeRemaining)}
        </span>
        <div className="w-20 h-1 bg-surface-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isLowTime
                ? "linear-gradient(90deg, #FF3B5C, #FF6B7F)"
                : "linear-gradient(90deg, #00F5FF, #00FFB2)",
            }}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="w-px h-6 bg-border-bright" />

      {/* Investor Interest */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <span className="text-text-muted tracking-widest text-[10px] uppercase">Interest</span>
        <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: interestColor }}
            animate={{ width: `${interest}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <span
          className="font-bold tabular-nums text-[10px]"
          style={{ color: interest < 20 ? "#FF3B5C" : interest < 60 ? "#F59E0B" : "#7B61FF" }}
        >
          {Math.round(interest)}%
        </span>
      </div>
    </motion.div>
  );
}

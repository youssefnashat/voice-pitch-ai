"use client";

import { useEffect, useState } from "react";

interface ScoreBarProps {
  label: string;
  score: number;
  feedback: string;
}

export function ScoreBar({ label, score, feedback }: ScoreBarProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    setDisplayScore(0);
    // Animate from 0 to score in ~1.5s using 0.1 steps
    const steps = Math.round(score * 10); // e.g. 7.3 → 73 steps
    const intervalMs = steps > 0 ? Math.round(1500 / steps) : 50;
    const stepSize = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepSize;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current * 10) / 10);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [score]);

  const color = score >= 7 ? "#00FFB2" : score >= 4 ? "#00F5FF" : "#FF3B5C";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-foreground/80">{label}</span>
        <span className="text-lg font-bold font-mono" style={{ color }}>
          {displayScore.toFixed(1)}<span className="text-text-muted text-xs">/10</span>
        </span>
      </div>
      <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(displayScore / 10) * 100}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>
      <p className="text-[11px] text-text-muted leading-relaxed">{feedback}</p>
    </div>
  );
}

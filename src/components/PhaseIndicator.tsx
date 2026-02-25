"use client";

import { Phase } from "@/types";

interface PhaseIndicatorProps {
  phase: Phase;
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const phaseConfig: Record<Phase, { label: string; color: string }> = {
    landing: { label: "Welcome", color: "bg-slate-400" },
    pitch: { label: "Your Pitch", color: "bg-blue-500" },
    qa: { label: "Q&A", color: "bg-yellow-500" },
    negotiation: { label: "Negotiation", color: "bg-orange-500" },
    close: { label: "Closing", color: "bg-purple-500" },
    scorecard: { label: "Scorecard", color: "bg-green-500" },
  };

  const config = phaseConfig[phase];

  return (
    <div className={`px-4 py-2 rounded-full ${config.color} text-white text-sm font-semibold`}>
      {config.label}
    </div>
  );
}

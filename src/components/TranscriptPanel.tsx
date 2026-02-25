"use client";

import { useEffect, useRef } from "react";
import { TranscriptEntry, ConfidenceTier } from "@/types";

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  isListening: boolean;
  isSilent: boolean;
}

// Guardrail 6 indicator: colored dot showing STT confidence tier
const CONFIDENCE_DOT: Record<ConfidenceTier, { color: string; label: string }> =
  {
    high: { color: "#00FFB2", label: "High confidence" },
    medium: { color: "#F59E0B", label: "Medium confidence" },
    low: { color: "#FF3B5C", label: "Low confidence" },
  };

export function TranscriptPanel({
  transcript,
  isListening,
  isSilent,
}: TranscriptPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="h-full p-4 overflow-y-auto flex flex-col">
      <div className="space-y-3 mb-4">
        {transcript.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <div
              className="w-1 rounded-full shrink-0 mt-1"
              style={{
                height: 12,
                background:
                  entry.speaker === "user"
                    ? "rgba(0, 255, 178, 0.5)"
                    : "rgba(0, 245, 255, 0.5)",
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p
                  className="text-[10px] font-mono font-bold tracking-wider uppercase"
                  style={{
                    color:
                      entry.speaker === "user"
                        ? "rgba(0, 255, 178, 0.6)"
                        : "rgba(0, 245, 255, 0.6)",
                  }}
                >
                  {entry.speaker === "user" ? "You" : "Investor"}
                </p>
                {/* Confidence badge — shown only for user entries with a confidence tier */}
                {entry.speaker === "user" && entry.confidenceTier && (
                  <span
                    title={CONFIDENCE_DOT[entry.confidenceTier].label}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor:
                        CONFIDENCE_DOT[entry.confidenceTier].color,
                      flexShrink: 0,
                      opacity: entry.recoveryTriggered ? 0.5 : 1,
                    }}
                  />
                )}
              </div>
              <p
                className={`text-[13px] leading-relaxed ${
                  entry.isInterim
                    ? "text-text-muted italic"
                    : entry.recoveryTriggered
                    ? "text-text-muted line-through"
                    : "text-foreground/80"
                }`}
              >
                {entry.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isListening && !isSilent && transcript.length > 0 && (
        <p className="text-[10px] text-emerald/50 font-mono tracking-wider">
          Listening...
        </p>
      )}

      {isSilent && isListening && (
        <p className="text-[10px] text-cyan-dim font-mono tracking-wider">
          Still there? Take your time.
        </p>
      )}

      <div ref={endRef} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, User, Award, FileText } from "lucide-react";
import { formatDuration } from "@/lib/utils";

const AGENT_NAMES: Record<string, string> = {
  marcus: "Marcus Chen",
};

interface DimensionScore {
  score?: number;
  feedback?: string;
}

interface PitchDetail {
  id: string;
  username: string;
  agent: string;
  overall_score: number;
  dimensions?: Record<string, DimensionScore>;
  top_weakness?: string | null;
  rewritten_opener?: string | null;
  improved_answer?: string | null;
  transcript: Array<{ speaker: string; text: string }> | null;
  duration_seconds: number | null;
  created_at: string;
}

interface PitchDetailModalProps {
  pitchId: string | null;
  onClose: () => void;
}

export function PitchDetailModal({ pitchId, onClose }: PitchDetailModalProps) {
  const [pitch, setPitch] = useState<PitchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (pitchId) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pitchId, onClose]);

  useEffect(() => {
    if (!pitchId) {
      setPitch(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/pitches/${pitchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.pitch) {
          setPitch(data.pitch);
        } else {
          setError(data?.error || "Failed to load pitch");
        }
      })
      .catch(() => setError("Failed to load pitch"))
      .finally(() => setLoading(false));
  }, [pitchId]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const dimensionLabels: Record<string, string> = {
    clarity: "Clarity",
    market: "Market Fit",
    traction: "Traction",
    unit_economics: "Unit Economics",
    delivery: "Delivery",
  };

  return (
    <AnimatePresence mode="wait">
      {pitchId ? (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Pitch Details</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {pitch && !loading && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Clock size={18} className="text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Duration</p>
                        <p className="font-mono font-bold text-white">{formatDuration(pitch.duration_seconds)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <User size={18} className="text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Investor</p>
                        <p className="font-medium text-white">{AGENT_NAMES[pitch.agent] || pitch.agent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <Award size={18} className="text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Score</p>
                        <p className="font-bold text-cyan-400">{pitch.overall_score}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Posted</p>
                    <p className="text-sm text-gray-300">{formatDate(pitch.created_at)}</p>
                  </div>

                  {pitch.dimensions && Object.keys(pitch.dimensions).length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Score Breakdown</p>
                      <div className="space-y-3">
                        {Object.entries(pitch.dimensions).map(([key, dim]) => (
                          <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white">
                                {dimensionLabels[key] || key}
                              </span>
                              <span className="font-mono text-cyan-400 font-bold">{dim.score ?? "—"}</span>
                            </div>
                            {dim.feedback && (
                              <p className="text-xs text-gray-400 mt-1">{dim.feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pitch.top_weakness && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Top Weakness</p>
                      <p className="text-sm text-gray-300">{pitch.top_weakness}</p>
                    </div>
                  )}

                  {pitch.transcript && pitch.transcript.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={16} className="text-cyan-400" />
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Transcript</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 max-h-64 overflow-y-auto">
                        <div className="space-y-3 text-sm">
                          {pitch.transcript.map((entry, i) => (
                            <div key={i} className="flex gap-2">
                              <span
                                className={
                                  entry.speaker === "user"
                                    ? "text-cyan-400 font-medium shrink-0"
                                    : "text-purple-400 font-medium shrink-0"
                                }
                              >
                                {entry.speaker === "user" ? "You:" : "Investor:"}
                              </span>
                              <span className="text-gray-300">{entry.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

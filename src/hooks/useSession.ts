"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TranscriptEntry, ConversationHistory, Phase } from "@/types";
import { useSmallestSTT } from "./useSmallestSTT";
import { useElevenLabsTTS } from "./useElevenLabsTTS";
import { VOICE_CONFIG } from "@/lib/voice-config";

type LLMStatus = "idle" | "thinking" | "stalling";

const STALL_MESSAGES = [
  "That's an interesting point. Give me a moment.",
  "Let me think about that for a second.",
  "Good question — processing that now.",
];

export function useSession() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<ConversationHistory[]>([]);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [marcusThinking, setMarcusThinking] = useState<LLMStatus>("idle");

  const stt = useSmallestSTT();
  const tts = useElevenLabsTTS();

  // Refs for accessing latest state in event handlers
  const historyRef = useRef(history);
  historyRef.current = history;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const exchangeCountRef = useRef(exchangeCount);
  exchangeCountRef.current = exchangeCount;

  // Silence event listeners
  useEffect(() => {
    const onSilenceWarning = () => setSilenceWarning(true);
    const onSilenceTimeout = () => setSilenceWarning(false);

    window.addEventListener("stt:silence-warning", onSilenceWarning);
    window.addEventListener("stt:silence-timeout", onSilenceTimeout);

    return () => {
      window.removeEventListener("stt:silence-warning", onSilenceWarning);
      window.removeEventListener("stt:silence-timeout", onSilenceTimeout);
    };
  }, []);

  const addTranscriptEntry = useCallback(
    (speaker: "user" | "investor", text: string, isInterim = false) => {
      const id = `${speaker}-${Date.now()}-${Math.random()}`;
      const entry: TranscriptEntry = {
        id,
        speaker,
        text,
        timestamp: Date.now(),
        isInterim,
      };
      setTranscript((prev) => {
        if (isInterim && prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.speaker === speaker && last.isInterim) {
            return [...prev.slice(0, -1), { ...last, text }];
          }
        }
        return [...prev, entry];
      });
    },
    []
  );

  const addHistoryEntry = useCallback(
    (role: "user" | "assistant", content: string) => {
      setHistory((prev) => [...prev, { role, content }]);
    },
    []
  );

  const recordExchange = useCallback(() => {
    setExchangeCount((prev) => {
      const next = prev + 1;
      if (prev === 0) setPhase("qa");
      else if (prev === 2) setPhase("negotiation");
      else if (prev >= 3) setPhase("scorecard");
      return next;
    });
  }, []);

  const startPitch = useCallback(async () => {
    setPhase("pitch");
    setTranscript([]);
    setHistory([]);
    setExchangeCount(0);
    setElapsedSeconds(0);
    setSilenceWarning(false);
    setMarcusThinking("idle");
    await stt.startListening();
  }, [stt]);

  const submitTurn = useCallback(async () => {
    // Grab finalized text first, fall back to interim if the user clicked
    // Stop & Send before the STT engine finalized the utterance.
    const userText = (stt.transcript + " " + stt.interimTranscript).trim();

    stt.stopListening();
    setSilenceWarning(false);
    setMarcusThinking("idle");

    if (!userText) {
      console.warn("[chat] nothing to send — transcript was empty");
      return;
    }

    addTranscriptEntry("user", userText, false);
    addHistoryEntry("user", userText);

    let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
    let stallingTimer: ReturnType<typeof setTimeout> | null = null;

    thinkingTimer = setTimeout(() => {
      setMarcusThinking("thinking");
    }, VOICE_CONFIG.TIMEOUTS.LLM);

    stallingTimer = setTimeout(() => {
      setMarcusThinking("stalling");
    }, VOICE_CONFIG.TIMEOUTS.LLM_STALL);

    try {
      console.log("[chat] sending to backend:", userText);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userText,
          history: historyRef.current,
        }),
      });

      if (thinkingTimer) clearTimeout(thinkingTimer);
      if (stallingTimer) clearTimeout(stallingTimer);
      setMarcusThinking("idle");

      if (!response.ok) throw new Error(`Chat API failed (${response.status})`);

      const data = await response.json();
      const text = data.agentText || "That's interesting. Let me think about that.";
      console.log("[chat] response:", text.slice(0, 80));

      addHistoryEntry("assistant", text);
      addTranscriptEntry("investor", text, false);
      recordExchange();

      await tts.speak(text);

      if (phaseRef.current !== "scorecard") {
        stt.reset();
        await stt.startListening();
      }
    } catch (err) {
      if (thinkingTimer) clearTimeout(thinkingTimer);
      if (stallingTimer) clearTimeout(stallingTimer);
      setMarcusThinking("idle");

      console.error("[chat] turn error:", err);
      const fallback =
        STALL_MESSAGES[Math.floor(Math.random() * STALL_MESSAGES.length)];
      addTranscriptEntry("investor", fallback, false);
      addHistoryEntry("assistant", fallback);
      await tts.speak(fallback);

      if (phaseRef.current !== "scorecard") {
        stt.reset();
        await stt.startListening();
      }
    }
  }, [stt, tts, addTranscriptEntry, addHistoryEntry, recordExchange]);

  const endSession = useCallback(async () => {
    stt.stopListening();
    tts.stop();
    setPhase("scorecard");
    setSilenceWarning(false);
    setMarcusThinking("idle");

    try {
      const response = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("Scorecard error:", err);
      return null;
    }
  }, [stt, tts, transcript]);

  const reset = useCallback(() => {
    stt.stopListening();
    stt.reset();
    tts.stop();
    setPhase("landing");
    setTranscript([]);
    setHistory([]);
    setExchangeCount(0);
    setElapsedSeconds(0);
    setSilenceWarning(false);
    setMarcusThinking("idle");
  }, [stt, tts]);

  return {
    // Session state
    phase,
    transcript,
    history,
    exchangeCount,
    elapsedSeconds,
    setElapsedSeconds,

    // STT state
    sttTranscript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    isListening: stt.state === "listening",
    sttState: stt.state,
    sttError: stt.error,
    usingFallbackSTT: stt.usingFallback,

    // TTS state
    isSpeaking: tts.isPlaying,
    ttsState: tts.state,
    usingFallbackTTS: tts.usingFallback,

    // UI state
    silenceWarning,
    marcusThinking,

    // Actions
    startPitch,
    submitTurn,
    endSession,
    reset,
    addTranscriptEntry,
    addHistoryEntry,
    stopListening: stt.stopListening,
  };
}

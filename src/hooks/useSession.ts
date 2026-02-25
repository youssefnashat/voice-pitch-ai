"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  TranscriptEntry,
  ConversationHistory,
  Phase,
  ConfidenceTier,
  CurrentOffer,
} from "@/types";
import { useSmallestSTT } from "./useSmallestSTT";
import { useElevenLabsTTS } from "./useElevenLabsTTS";
import { VOICE_CONFIG } from "@/lib/voice-config";

type LLMStatus = "idle" | "thinking" | "stalling";

const STALL_MESSAGES = [
  "That's an interesting point. Give me a moment.",
  "Let me think about that for a second.",
  "Good question — processing that now.",
];

// ── Guardrail 7 helpers ────────────────────────────────────────────────────────
const DIMENSIONS = [
  "market size",
  "your traction numbers",
  "unit economics",
  "your competitive moat",
  "the team",
  "the raise amount",
  "your founder-market fit",
];

function getNextUnprobedDimension(qaCount: number): string {
  return DIMENSIONS[Math.min(qaCount, DIMENSIONS.length - 1)];
}

function containsOfferLanguage(text: string): boolean {
  return /willing to put in|here.?s where i land|I'?d (invest|offer)|at a .{1,30} cap|valuation cap/i.test(
    text
  );
}

function isCloseSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("scorecard is being generated") ||
    lower.includes("think we can work together") ||
    lower.includes("going to pass for now")
  );
}

// ── Offer detection ────────────────────────────────────────────────────────────
function detectOffer(text: string): CurrentOffer | null {
  // Pattern: "put in $X at a $Y cap"
  const match = text.match(
    /put in \$?([\d,]+(?:\.\d+)?)\s*(M(?:illion)?|K|B(?:illion)?)?\b.*?at\s+a?\s+\$?([\d,]+(?:\.\d+)?)\s*(M(?:illion)?|K|B(?:illion)?)?/i
  );
  if (!match) return null;

  const parseAmt = (num: string, unit?: string): number => {
    const n = parseFloat(num.replace(/,/g, ""));
    if (!unit) return n;
    if (/^M/i.test(unit)) return n * 1_000_000;
    if (/^K/i.test(unit)) return n * 1_000;
    if (/^B/i.test(unit)) return n * 1_000_000_000;
    return n;
  };

  return {
    checkSize: parseAmt(match[1], match[2]),
    valuation: parseAmt(match[3], match[4]),
    equity: 0, // equity parsed separately if needed
  };
}

// ── Topic extraction ───────────────────────────────────────────────────────────
// Only extract a topic if the message is substantive (≥12 words with a verb).
// Returning "" prevents the off-topic guardrail from echoing garbled short phrases.
function extractPitchTopic(text: string): string {
  const words = text.trim().split(/\s+/);
  const hasVerb = /\b(is|are|was|were|do|does|did|have|has|had|will|would|can|build|solve|help|make|create|offer|provide|sell|serve)\b/i.test(text);
  if (words.length < 12 || !hasVerb) return "";
  return words.slice(-6).join(" ").replace(/[.!?,]+$/, "");
}

// ── User signal delta ──────────────────────────────────────────────────────────
// Analyzes the founder's spoken text for investability signals and red flags.
// Applied client-side immediately when the user submits a turn.
function computeUserSignalDelta(text: string): number {
  let score = 0;
  const words = text.trim().split(/\s+/).length;

  // ── Strong positive signals (+15 each) ──────────────────────────────────────
  // Specific revenue/ARR/MRR numbers  e.g. "$200K ARR", "$50K MRR"
  if (/\$[\d,.]+\s*(k|m|million)?\s*(arr|mrr|revenue)/i.test(text)) score += 15;
  // Week-over-week or retention percentages  e.g. "15% WoW growth", "85% retention"
  if (/\d+\s*%\s*(week.?over.?week|wow|retention|growth)/i.test(text)) score += 15;
  // Concrete paying customer count  e.g. "120 paying customers"
  if (/\b\d+\s+paying\s+(customer|user)/i.test(text)) score += 15;
  // Named signed deal / contract  e.g. "signed a contract", "closed the deal"
  if (/(signed|closed|landed).{0,25}(contract|deal|customer|client)/i.test(text)) score += 15;

  // ── Medium positive signals (+8 each) ───────────────────────────────────────
  // Unit economics fluency  e.g. "our CAC is $40", "LTV is $800"
  if (/\b(cac|ltv|arpu|churn|gross margin)\b.{0,20}\d/i.test(text)) score += 8;
  // Named pilot / enterprise proof  e.g. "we have a pilot with [Company]"
  if (/\b(pilot|poc|proof of concept).{0,20}(with|at|for)\b/i.test(text)) score += 8;
  // Specific named metric with number  e.g. "40% month-over-month", "NPS of 72"
  if (/\b(nps|dau|mau|d30|d7|payback period|ltv.?cac)\b.{0,15}\d/i.test(text)) score += 8;
  // Named enterprise customer or logo
  if (/\b(enterprise|fortune|government|hospital|school district).{0,20}(customer|client|user|contract)/i.test(text)) score += 8;

  // ── Strong red flags (-12 each) ─────────────────────────────────────────────
  // Classic VC-killing deflects
  if (/we'?ll figure( it)? out/i.test(text)) score -= 12;
  if (/haven'?t (thought|figured|worked) (about|on|through)/i.test(text)) score -= 12;
  if (/not (really|sure) (about|how|what)/i.test(text)) score -= 12;
  // Vague non-answer to a direct numbers question
  if (/\b(a lot|tons|loads|plenty|many|several|some|a few) of (user|customer|client|revenue|traction)/i.test(text)) score -= 12;

  // ── Moderate red flags (-8 each) ────────────────────────────────────────────
  if (/\b(significant|substantial|massive|huge|tremendous) (revenue|traction|growth|opportunity)/i.test(text)) score -= 8;
  if (/still working on|not yet (live|launched)|pre.?revenue without/i.test(text)) score -= 8;
  if (/don'?t have (that|those|the numbers|data|metrics) (yet|right now)/i.test(text)) score -= 8;
  if (/\b(disrupting|revolutionizing|transforming) the (industry|market|space|world)/i.test(text)) score -= 8;

  // ── Short / evasive answer (-10) ────────────────────────────────────────────
  // Very short answer in QA context — likely dodging the question
  if (words < 8) score -= 10;

  return Math.max(-15, Math.min(15, score));
}

// ── Confidence tier ────────────────────────────────────────────────────────────
// null = no confidence data from STT → treat as medium (not high).
// Thresholds are tighter than before: real clear speech from Smallest AI scores 0.85+.
function getConfidenceTier(confidence: number | null): ConfidenceTier {
  if (confidence === null) return "medium"; // unknown → conservative
  if (confidence < 0.65) return "low";      // garbled/noisy — trigger recovery
  if (confidence < 0.85) return "medium";   // uncertain — inject clarification note
  return "high";                            // clear speech — pass normally
}

// ─────────────────────────────────────────────────────────────────────────────

export function useSession() {
  // ── Core session state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("landing");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<ConversationHistory[]>([]);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [marcusThinking, setMarcusThinking] = useState<LLMStatus>("idle");

  // ── Extended guardrail state ───────────────────────────────────────────────
  const [qaExchangeCount, setQaExchangeCount] = useState(0);
  const [lastPitchTopic, setLastPitchTopic] = useState("");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<CurrentOffer | null>(null);
  const [dimensionsProbed, setDimensionsProbed] = useState<string[]>([]);

  // ── Interest / investment state ────────────────────────────────────────────
  const [interestLevel, setInterestLevel] = useState(0);
  const [investmentDecision, setInvestmentDecision] = useState<"invested" | "passed" | null>(null);
  const [shouldAutoEnd, setShouldAutoEnd] = useState(false);

  const stt = useSmallestSTT();
  const tts = useElevenLabsTTS();

  // ── Refs for latest state in callbacks ────────────────────────────────────
  const historyRef = useRef(history);
  historyRef.current = history;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const exchangeCountRef = useRef(exchangeCount);
  exchangeCountRef.current = exchangeCount;
  const qaExchangeCountRef = useRef(qaExchangeCount);
  qaExchangeCountRef.current = qaExchangeCount;
  const lastPitchTopicRef = useRef(lastPitchTopic);
  lastPitchTopicRef.current = lastPitchTopic;
  const isAgentSpeakingRef = useRef(isAgentSpeaking);
  isAgentSpeakingRef.current = isAgentSpeaking;
  const currentOfferRef = useRef(currentOffer);
  currentOfferRef.current = currentOffer;
  const interestLevelRef = useRef(interestLevel);
  interestLevelRef.current = interestLevel;

  const pitchStartMsRef = useRef<number | null>(null);
  // Guardrail 5: 15-second failsafe to clear isAgentSpeaking if TTS hangs
  const agentSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Guardrail 5: isAgentSpeaking manager ──────────────────────────────────
  const setAgentSpeaking = useCallback((speaking: boolean) => {
    if (agentSpeakingTimeoutRef.current) {
      clearTimeout(agentSpeakingTimeoutRef.current);
      agentSpeakingTimeoutRef.current = null;
    }
    isAgentSpeakingRef.current = speaking;
    setIsAgentSpeaking(speaking);
    if (speaking) {
      // Failsafe: auto-clear after 15 seconds if TTS never fires "ended"
      agentSpeakingTimeoutRef.current = setTimeout(() => {
        isAgentSpeakingRef.current = false;
        setIsAgentSpeaking(false);
      }, 15_000);
    }
  }, []);

  // ── Elapsed time timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (
      phase === "landing" ||
      phase === "scorecard" ||
      pitchStartMsRef.current == null
    )
      return;
    const tick = () => {
      if (pitchStartMsRef.current != null) {
        setElapsedSeconds(
          Math.floor((Date.now() - pitchStartMsRef.current) / 1000)
        );
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Silence event listeners ───────────────────────────────────────────────
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

  // ── Auto-end when investor interest drops below 20% ───────────────────────
  const autoEndTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      interestLevel < 20 &&
      interestLevel > 0 &&
      !["landing", "scorecard", "pitch"].includes(phase) &&
      !autoEndTriggeredRef.current
    ) {
      autoEndTriggeredRef.current = true;
      setInvestmentDecision("passed");
      setShouldAutoEnd(true);
    }
  }, [interestLevel, phase]);

  // ── addTranscriptEntry ────────────────────────────────────────────────────
  const addTranscriptEntry = useCallback(
    (
      speaker: "user" | "investor",
      text: string,
      isInterim = false,
      confidence?: number,
      confidenceTier?: ConfidenceTier,
      wasAccepted?: boolean,
      recoveryTriggered?: boolean
    ) => {
      const id = `${speaker}-${Date.now()}-${Math.random()}`;
      const entry: TranscriptEntry = {
        id,
        speaker,
        text,
        timestamp: Date.now(),
        isInterim,
        confidence,
        confidenceTier,
        wasAccepted,
        recoveryTriggered,
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

  // ── recordExchange — phase machine with Guardrail 7 ───────────────────────
  const recordExchange = useCallback((agentText?: string) => {
    const currentPhase = phaseRef.current;

    setExchangeCount((prev) => prev + 1);

    if (currentPhase === "pitch") {
      // pitch → qa after the first exchange; interest stays at base 50
      setPhase("qa");
      setQaExchangeCount(0);
      setInterestLevel(50);
    } else if (currentPhase === "qa") {
      setQaExchangeCount((prev) => {
        const newCount = prev + 1;
        // Tiny baseline +2 — signals (sentimentDelta + userSignalDelta) do the
        // real work. Keeping this small means a bad pitch visibly drops.
        setInterestLevel((lvl) => Math.min(100, lvl + 2));
        // Guardrail 7: NEGOTIATION requires ≥3 Q&A exchanges
        if (newCount >= 3) {
          setPhase("negotiation");
          // No artificial floor — let the interest land wherever signals drove it
        }
        return newCount;
      });
    } else if (currentPhase === "negotiation") {
      if (agentText) {
        const offer = detectOffer(agentText);
        if (offer) {
          setCurrentOffer(offer);
          currentOfferRef.current = offer;
          setInterestLevel(82); // offer on the table → high interest
        }

        if (isCloseSignal(agentText)) {
          const isDeal =
            agentText.toLowerCase().includes("think we can work together") ||
            currentOfferRef.current !== null;

          if (isDeal) {
            setInterestLevel(100);
            setInvestmentDecision("invested");
          } else {
            // Pass signal — drops interest below 20, triggers auto-end
            setInterestLevel(10);
            setInvestmentDecision("passed");
          }
          setPhase("scorecard");
        }
      }
    } else if (currentPhase === "close") {
      setPhase("scorecard");
    }
  }, []);

  // ── startPitch ────────────────────────────────────────────────────────────
  const startPitch = useCallback(async () => {
    pitchStartMsRef.current = Date.now();
    setPhase("pitch");
    setTranscript([]);
    setHistory([]);
    setExchangeCount(0);
    setQaExchangeCount(0);
    setLastPitchTopic("");
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    setCurrentOffer(null);
    currentOfferRef.current = null;
    setDimensionsProbed([]);
    setInterestLevel(50);
    interestLevelRef.current = 50;
    setInvestmentDecision(null);
    setShouldAutoEnd(false);
    autoEndTriggeredRef.current = false;
    setElapsedSeconds(0);
    setSilenceWarning(false);
    setMarcusThinking("idle");

    stt.arm();
    await stt.startListening();
  }, [stt]);

  // ── submitTurn — main turn handler with all client-side guardrails ─────────
  const submitTurn = useCallback(async () => {
    // Guardrail 5: Block if agent is currently speaking
    if (isAgentSpeakingRef.current) {
      console.warn("[chat] submitTurn blocked — agent is speaking");
      return;
    }

    const userText = (stt.transcript + " " + stt.interimTranscript).trim();

    stt.stopListening();
    setSilenceWarning(false);
    setMarcusThinking("idle");

    if (!userText) {
      console.warn("[chat] nothing to send — transcript was empty");
      return;
    }

    // ── User signal delta: react to what the FOUNDER said ────────────────────
    // Only apply during active pitch phases (not at landing/scorecard baseline)
    if (phaseRef.current === "qa" || phaseRef.current === "negotiation") {
      const userDelta = computeUserSignalDelta(userText);
      if (userDelta !== 0) {
        setInterestLevel((prev) => Math.max(0, Math.min(100, prev + userDelta)));
      }
    }

    // ── Guardrail 6: Confidence tier check ───────────────────────────────────
    // Pass null directly — getConfidenceTier treats null as "medium" (unknown, conservative).
    // Never default to 1.0 (high) as that lets garbled audio pass unchecked.
    const confidence = stt.lastConfidence; // number | null
    const confidenceTier = getConfidenceTier(confidence);

    if (confidenceTier === "low") {
      // Do not forward to LLM — ask to repeat
      const recoveryText =
        "I didn't quite catch that. Could you repeat your last point?";
      addTranscriptEntry("user", userText, false, confidence ?? undefined, "low", false, true);
      addTranscriptEntry("investor", recoveryText, false);
      addHistoryEntry("assistant", recoveryText);
      setAgentSpeaking(true);
      try {
        await tts.speak(recoveryText);
      } finally {
        setAgentSpeaking(false);
      }
      if (phaseRef.current !== "scorecard") {
        stt.reset();
        await stt.startListening();
      }
      return;
    }

    // Log accepted turn
    addTranscriptEntry("user", userText, false, confidence ?? undefined, confidenceTier, true, false);
    addHistoryEntry("user", userText);

    // Update last pitch topic for off-topic guardrail
    setLastPitchTopic(extractPitchTopic(userText));

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
          // Guardrail context
          phase: phaseRef.current,
          lastPitchTopic: lastPitchTopicRef.current,
          qaExchangeCount: qaExchangeCountRef.current,
          confidenceTier,
          currentOffer: currentOfferRef.current,
        }),
      });

      if (thinkingTimer) clearTimeout(thinkingTimer);
      if (stallingTimer) clearTimeout(stallingTimer);
      setMarcusThinking("idle");

      // Don't throw on non-ok — handle inline to avoid React 19 error overlay
      if (!response.ok) {
        console.error(`[chat] API returned ${response.status}`);
        if (thinkingTimer) clearTimeout(thinkingTimer);
        if (stallingTimer) clearTimeout(stallingTimer);
        setMarcusThinking("idle");
        const fallback = STALL_MESSAGES[Math.floor(Math.random() * STALL_MESSAGES.length)];
        addTranscriptEntry("investor", fallback, false);
        addHistoryEntry("assistant", fallback);
        setAgentSpeaking(true);
        try { await tts.speak(fallback); } finally { setAgentSpeaking(false); }
        if (phaseRef.current !== "scorecard") { stt.reset(); await stt.startListening(); }
        return;
      }

      const data = await response.json();
      let text: string =
        data.agentText || "That's interesting. Let me think about that.";

      // Apply sentiment delta — drives interest up/down based on investor reaction
      const sentimentDelta: number = data.sentimentDelta ?? 0;
      if (sentimentDelta !== 0) {
        setInterestLevel((prev) => Math.max(0, Math.min(100, prev + sentimentDelta)));
      }

      // ── Guardrail 7 (client): block offers during pitch / early QA ──────────
      if (
        (phaseRef.current === "pitch" ||
          (phaseRef.current === "qa" && qaExchangeCountRef.current < 3)) &&
        containsOfferLanguage(text)
      ) {
        const nextDim = getNextUnprobedDimension(qaExchangeCountRef.current);
        text = `Let's finish the Q&A first. I want to understand ${nextDim} before we talk terms.`;
      }

      console.log("[chat] response:", text.slice(0, 80));

      addHistoryEntry("assistant", text);
      addTranscriptEntry("investor", text, false);
      recordExchange(text);

      // Guardrail 5: Mark agent as speaking before TTS; clear after
      setAgentSpeaking(true);
      try {
        await tts.speak(text);
      } finally {
        setAgentSpeaking(false);
      }

      if (phaseRef.current !== "scorecard") {
        stt.reset();
        await stt.startListening();
      }
    } catch (err) {
      if (thinkingTimer) clearTimeout(thinkingTimer);
      if (stallingTimer) clearTimeout(stallingTimer);
      setMarcusThinking("idle");
      setAgentSpeaking(false);

      console.error("[chat] turn error:", err);
      const fallback =
        STALL_MESSAGES[Math.floor(Math.random() * STALL_MESSAGES.length)];
      addTranscriptEntry("investor", fallback, false);
      addHistoryEntry("assistant", fallback);

      setAgentSpeaking(true);
      try {
        await tts.speak(fallback);
      } finally {
        setAgentSpeaking(false);
      }

      if (phaseRef.current !== "scorecard") {
        stt.reset();
        await stt.startListening();
      }
    }
  }, [stt, tts, addTranscriptEntry, addHistoryEntry, recordExchange, setAgentSpeaking]);

  // ── endSession ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    stt.stopListening();
    tts.stop();
    const durationSeconds =
      pitchStartMsRef.current != null
        ? Math.round((Date.now() - pitchStartMsRef.current) / 1000)
        : 0;
    setElapsedSeconds(durationSeconds);
    setPhase("scorecard");
    setSilenceWarning(false);
    setMarcusThinking("idle");
    setAgentSpeaking(false);

    try {
      const response = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, history: historyRef.current }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("Scorecard error:", err);
      return null;
    }
  }, [stt, tts, transcript, setAgentSpeaking]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    pitchStartMsRef.current = null;
    stt.stopListening();
    stt.reset();
    tts.stop();
    setPhase("landing");
    setTranscript([]);
    setHistory([]);
    setExchangeCount(0);
    setQaExchangeCount(0);
    setLastPitchTopic("");
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    setCurrentOffer(null);
    currentOfferRef.current = null;
    setDimensionsProbed([]);
    setInterestLevel(0);
    interestLevelRef.current = 0;
    setInvestmentDecision(null);
    setShouldAutoEnd(false);
    autoEndTriggeredRef.current = false;
    setElapsedSeconds(0);
    setSilenceWarning(false);
    setMarcusThinking("idle");
    if (agentSpeakingTimeoutRef.current) {
      clearTimeout(agentSpeakingTimeoutRef.current);
      agentSpeakingTimeoutRef.current = null;
    }
  }, [stt, tts]);

  return {
    // Session state
    phase,
    transcript,
    history,
    exchangeCount,
    elapsedSeconds,
    setElapsedSeconds,

    // Guardrail state
    qaExchangeCount,
    lastPitchTopic,
    isAgentSpeaking,
    currentOffer,
    dimensionsProbed,

    // Interest / investment
    interestLevel,
    investmentDecision,
    shouldAutoEnd,

    // STT state
    sttTranscript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    isListening: stt.state === "listening",
    sttState: stt.state,
    sttError: stt.error,
    usingFallbackSTT: stt.usingFallback,
    lastConfidence: stt.lastConfidence,

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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_CONFIG } from "@/lib/voice-config";

export type STTState = "idle" | "connecting" | "listening" | "error";

interface UseSmallestSTTReturn {
  transcript: string;
  interimTranscript: string;
  state: STTState;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  reset: () => void;
  usingFallback: boolean;
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export function useSmallestSTT(): UseSmallestSTTReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [state, setState] = useState<STTState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<any>(null);
  const silenceWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceAutoEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSilenceTimers = useCallback(() => {
    if (silenceWarningRef.current) clearTimeout(silenceWarningRef.current);
    if (silenceAutoEndRef.current) clearTimeout(silenceAutoEndRef.current);

    silenceWarningRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("stt:silence-warning"));

      silenceAutoEndRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("stt:silence-timeout"));
      }, VOICE_CONFIG.TIMEOUTS.SILENCE_AUTO_END - VOICE_CONFIG.TIMEOUTS.SILENCE_WARNING);
    }, VOICE_CONFIG.TIMEOUTS.SILENCE_WARNING);
  }, []);

  const clearSilenceTimers = useCallback(() => {
    if (silenceWarningRef.current) clearTimeout(silenceWarningRef.current);
    if (silenceAutoEndRef.current) clearTimeout(silenceAutoEndRef.current);
    silenceWarningRef.current = null;
    silenceAutoEndRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    clearSilenceTimers();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (fallbackRef.current) {
      fallbackRef.current.abort();
      fallbackRef.current = null;
    }
  }, [clearSilenceTimers]);

  const stateRef = useRef<STTState>(state);
  stateRef.current = state;

  const setupFallbackSTT = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        setTranscript((prev) => (prev + " " + final).trim());
        resetSilenceTimers();
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        console.error("[STT] Microphone access denied");
        setState("error");
        setError("Microphone blocked — allow it in browser site settings");
        fallbackRef.current = null;
        return;
      }
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("[STT] Fallback error:", e.error);
      }
    };

    recognition.onend = () => {
      if (stateRef.current === "listening" && fallbackRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or blocked
        }
      }
    };

    fallbackRef.current = recognition;
    return true;
  }, [resetSilenceTimers]);

  const startSmallestSTT = useCallback(async (): Promise<void> => {
    const apiKey = process.env.NEXT_PUBLIC_SMALLEST_API_KEY;
    if (!apiKey) throw new Error("Smallest AI API key not configured");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: VOICE_CONFIG.SMALLEST.SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    const audioContext = new AudioContext({
      sampleRate: VOICE_CONFIG.SMALLEST.SAMPLE_RATE,
    });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    const ws = new WebSocket(VOICE_CONFIG.SMALLEST.WS_URL);
    wsRef.current = ws;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(
          JSON.stringify({
            token: apiKey,
            sample_rate: VOICE_CONFIG.SMALLEST.SAMPLE_RATE,
            language: VOICE_CONFIG.SMALLEST.LANGUAGE,
          })
        );

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm = float32ToInt16(e.inputBuffer.getChannelData(0));
          ws.send(pcm.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        setState("listening");
        resetSilenceTimers();
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            if (data.is_final) {
              setTranscript((prev) => (prev + " " + data.transcript).trim());
              setInterimTranscript("");
            } else {
              setInterimTranscript(data.transcript);
            }
            resetSilenceTimers();
          }
        } catch {
          // Ignore non-JSON
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        // Only reset state if this WS is still the active one (not cleaned up for fallback)
        if (wsRef.current === ws) {
          setState("idle");
        }
      };
    });
  }, [resetSilenceTimers]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");

    if (VOICE_CONFIG.SMALLEST.ENABLED) {
      try {
        setState("connecting");
        setUsingFallback(false);
        await startSmallestSTT();
        return;
      } catch (err: any) {
        cleanup();
        if (err?.name === "NotAllowedError" || err?.message?.includes("not-allowed")) {
          console.error("[STT] Microphone access denied");
          setState("error");
          setError("Microphone blocked — allow it in browser site settings");
          return;
        }
        console.warn("[STT] Smallest STT failed, falling back:", err);
      }
    }

    // Fallback to browser STT
    setUsingFallback(true);
    if (setupFallbackSTT()) {
      stateRef.current = "listening";
      setState("listening");
      try {
        fallbackRef.current.start();
      } catch {
        setState("error");
        setError("Microphone blocked — allow it in browser site settings");
        return;
      }
      resetSilenceTimers();
    } else {
      setState("error");
      setError("Speech recognition not supported in this browser");
    }
  }, [startSmallestSTT, setupFallbackSTT, resetSilenceTimers, cleanup]);

  const stopListening = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setState("idle");
    setUsingFallback(false);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return {
    transcript,
    interimTranscript,
    state,
    error,
    startListening,
    stopListening,
    reset,
    usingFallback,
  };
}

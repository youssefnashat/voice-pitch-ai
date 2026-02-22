"use client";

import { useEffect, useRef, useState } from "react";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionProps) {
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const [isListening, setIsListening] = useState(false);
  const [isSilent, setIsSilent] = useState(false);

  useEffect(() => {
    // Initialize SpeechRecognition API
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      onError?.("SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setIsSilent(false);
      retryCountRef.current = 0;
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Clear silence timeout when speech is detected
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        setIsSilent(false);
      }

      // Send interim results
      if (interimTranscript) {
        onResult(interimTranscript, false);
      }

      // Send final results and set 2-second silence detection
      if (finalTranscript) {
        onResult(finalTranscript, true);

        silenceTimeoutRef.current = setTimeout(() => {
          setIsSilent(true);
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        console.error("[STT] Microphone access denied");
        setIsListening(false);
        onError?.("Microphone blocked — allow it in browser site settings");
        return;
      }

      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("[STT] Recognition error:", event.error);
      }
      onError?.(event.error);

      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        setTimeout(() => {
          try { recognition.start(); } catch { /* already running */ }
        }, 500);
      } else {
        setIsListening(false);
        onError?.("Microphone failed after 3 attempts. Please use text input.");
      }
    };

    recognition.onend = () => {
      // Auto-restart to keep listening
      if (isListening) {
        setTimeout(() => {
          recognition.start();
        }, 100);
      }
    };

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      recognition.abort();
    };
  }, [onResult, onError]);

  const start = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    }
  };

  return { start, stop, isListening, isSilent };
}

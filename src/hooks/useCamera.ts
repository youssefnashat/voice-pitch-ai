"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isOn: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not available in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsOn(true);
    } catch (err: any) {
      const name: string = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera blocked — allow it in browser site settings");
      } else if (name === "NotFoundError") {
        setError("No camera found");
      } else if (name === "NotReadableError") {
        setError("Camera is already in use by another app");
      } else {
        setError("Camera failed to start");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { videoRef, isOn, error, startCamera, stopCamera };
}

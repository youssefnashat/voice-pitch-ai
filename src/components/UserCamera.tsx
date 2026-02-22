"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";

export function UserCamera() {
  const { videoRef, isOn, error, startCamera, stopCamera } = useCamera();

  return (
    <div className="glass-panel rounded-xl relative scanline flex flex-col h-full overflow-hidden">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-emerald-400/40 to-transparent" />
      <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-emerald-400/40 to-transparent" />
      <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-emerald-400/40 to-transparent" />
      <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-emerald-400/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-purple/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-px h-8 bg-gradient-to-t from-purple/30 to-transparent" />
      <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-purple/30 to-transparent" />
      <div className="absolute bottom-0 right-0 w-px h-8 bg-gradient-to-t from-purple/30 to-transparent" />

      {/* Header */}
      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-400" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase">
            You
          </span>
        </div>
        <AnimatePresence>
          {isOn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0, 255, 178, 0.12)", border: "1px solid rgba(0, 255, 178, 0.3)" }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono text-[9px] tracking-wider text-emerald-400 uppercase">
                Live
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video / Placeholder */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-300 ${
            isOn ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ transform: "scaleX(-1)" }}
        />

        {!isOn && (
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <CameraOff className="w-8 h-8 opacity-30" />
            <span className="font-mono text-[11px] tracking-wider">
              Camera is off
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 px-4 pb-4 pt-2 flex flex-col gap-2">
        <button
          onClick={isOn ? stopCamera : startCamera}
          className="grain-hover w-full py-2 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: isOn ? "rgba(255, 59, 92, 0.08)" : "rgba(0, 255, 178, 0.08)",
            border: `1px solid ${isOn ? "rgba(255, 59, 92, 0.25)" : "rgba(0, 255, 178, 0.25)"}`,
            color: isOn ? "#FF3B5C" : "#00FFB2",
          }}
        >
          {isOn ? (
            <>
              <CameraOff className="w-3.5 h-3.5" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              Start Camera
            </>
          )}
        </button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 font-mono text-[10px] tracking-wider text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

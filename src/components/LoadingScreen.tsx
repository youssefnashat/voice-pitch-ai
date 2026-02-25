'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  const router = useRouter();
  const [isOrbLoaded, setIsOrbLoaded] = useState(false);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds

    const redirectTimer = setTimeout(() => {
      router.push('/about');
    }, duration);

    // Set orb loaded after entrance animation
    const orbTimer = setTimeout(() => {
      setIsOrbLoaded(true);
    }, 600);

    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(orbTimer);
    };
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
    >
      {/* Voice Orb */}
      <div className="relative mb-12 flex items-center justify-center">
        {/* Outer Glow / Pulse Orb */}
        <motion.div
          initial={{ scale: 0 }}
          animate={isOrbLoaded ? {
            scale: [1, 1.2, 1],
            boxShadow: [
              '0 0 20px rgba(0, 245, 255, 0.3)',
              '0 0 60px rgba(0, 245, 255, 0.6)',
              '0 0 20px rgba(0, 245, 255, 0.3)',
            ],
          } : {
            scale: 1,
          }}
          transition={isOrbLoaded ? {
            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          } : {
            type: 'spring',
            stiffness: 260,
            damping: 20,
            duration: 0.6
          }}
          className="h-[120px] w-[120px] rounded-full bg-[#00F5FF]"
        />
        
        {/* Separate rotation layer to avoid conflicts with pulse scale/shadow */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute h-[120px] w-[120px] rounded-full border border-cyan-400/20 pointer-events-none"
        />

        {/* Inner Orb */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, duration: 0.6, delay: 0.1 }}
          className="absolute h-[40px] w-[40px] rounded-full bg-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.8)]"
        />
      </div>

      {/* Text Content */}
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
        >
          Hello, Welcome to VoicePitch
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="text-gray-500 font-sans text-lg"
        >
          Preparing your pitch room...
        </motion.p>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: 'linear' }}
          className="h-full bg-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.5)]"
        />
      </div>
    </motion.div>
  );
}

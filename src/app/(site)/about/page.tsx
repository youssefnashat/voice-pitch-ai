'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  DoorOpen, Mic, Timer, MessageCircle, Trophy, 
  AlertTriangle, Brain, BarChart3 
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      staggerChildren: 0.2 
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4 }
  }
};

export default function AboutPage() {
  const features = [
    { icon: Mic, title: "Voice-First", desc: "Real-time speech recognition" },
    { icon: Brain, title: "AI-Powered", desc: "Natural conversations with Llama 3.3" },
    { icon: BarChart3, title: "Instant Feedback", desc: "Detailed scorecard in 60 seconds" },
    { icon: Trophy, title: "Global Leaderboard", desc: "Compete with founders worldwide" }
  ];

  const steps = [
    {
      number: "01",
      title: "Enter the Pitch Room",
      description: "Click the button to start your session with Marcus Chen.",
      icon: DoorOpen
    },
    {
      number: "02", 
      title: "Allow Microphone Access",
      description: "Grant permission so Marcus can hear your pitch clearly.",
      icon: Mic
    },
    {
      number: "03",
      title: "Deliver Your 30-60 Second Pitch",
      description: "You have 5 minutes total. Make it concise, compelling, and clear.",
      icon: Timer,
      highlight: "5 minute time limit"
    },
    {
      number: "04",
      title: "Answer Marcus's Follow-up Questions",
      description: "Defend your idea. He'll probe your market, traction, and unit economics.",
      icon: MessageCircle
    },
    {
      number: "05",
      title: "Receive Your Scorecard",
      description: "Get rated on confidence, clarity, market fit, and fundability. Rank on the global leaderboard.",
      icon: Trophy
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20">
      <motion.div 
        className="max-w-4xl mx-auto px-6 py-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* Section 1: Hero */}
        <motion.section variants={itemVariants} className="text-center mb-16">
          <h1 className="font-display text-6xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
            VoicePitch
          </h1>
          <p className="text-gray-400 text-xl text-center max-w-2xl mx-auto">
            Master your startup pitch against a ruthless AI investor
          </p>
        </motion.section>

        {/* Section 2: What is VoicePitch? */}
        <motion.section 
          variants={itemVariants}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-xl mb-12 shadow-2xl"
        >
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white mb-4">What is VoicePitch?</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  VoicePitch is an AI-powered investor simulation platform. Practice your startup pitch in a realistic VC meeting with Marcus Chen, a virtual venture capitalist powered by cutting-edge Llama 3.3 models.
                </p>
                <p>
                  Unlike rehearsing in a mirror or with friends, Marcus asks tough follow-up questions, challenges your assumptions, and scores you on the same criteria real investors use.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <feature.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Section 3: How to Pitch */}
        <motion.section variants={itemVariants} className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            How to Pitch to Marcus Chen
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden">
            <div className="space-y-12 relative">
              {/* Timeline Connector */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-500 to-purple-500 hidden md:block" />

              {steps.map((step, index) => (
                <motion.div 
                  key={step.number} 
                  variants={stepVariants}
                  className="flex gap-6 items-start relative z-10"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    {step.number}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      {step.highlight && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 uppercase font-bold tracking-wider">
                          {step.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                  
                  <div className="hidden md:block text-white/10">
                    <step.icon size={24} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Section 4: Critical Rules */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden border border-amber-500/30 bg-amber-500/10 rounded-xl p-6 mb-16 shadow-[0_0_20px_rgba(245,158,11,0.1)] animate-pulse-slow"
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-400 mb-1">Confidence Meter: Survival</h4>
                <p className="text-amber-200/80 text-sm leading-relaxed">
                  If your confidence drops below 20%, Marcus loses interest and ends the call immediately. 
                  Stay composed, speak clearly, and believe in your numbers.
                </p>
              </div>
            </div>

            <div className="hidden md:block w-px h-16 bg-white/10" />

            <div className="flex items-start gap-4 flex-1">
              <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                <Trophy className="text-emerald-400" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-400 mb-1">The Ultimate Goal</h4>
                <p className="text-emerald-200/80 text-sm leading-relaxed">
                  If you reach 100% confidence, Marcus will be fully satisfied with your pitch and 
                  commit to investing in your company.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 5: CTA */}
        <motion.section variants={itemVariants} className="text-center">
          <Link href="/pitch/select" className="inline-block group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
            <button className="relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold text-xl rounded-xl transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(0,245,255,0.5)]">
              Start Pitching
            </button>
          </Link>
          <p className="mt-4 text-gray-500 text-sm">Join founders practicing their pitch today.</p>
        </motion.section>

      </motion.div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 35px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import VoicePitchOrb from '@/components/VoicePitchOrb';
import { cn } from '@/lib/utils';

const agents = [
  {
    id: 'marcus',
    name: 'Marcus Chen',
    title: 'Managing Partner, Apex Ventures',
    tags: ['$2.4B AUM', '47 exits', 'Skeptical by default'],
    description: 'A seasoned VC who probes deep into market fit and unit economics. Expect tough questions and rapid-fire follow-ups.',
    available: true,
  },
  {
    id: 'mystery1',
    name: '???',
    title: 'Mystery Investor',
    tags: ['???', '???', '???'],
    description: 'A new investor is joining the platform soon. Check back for updates.',
    available: false,
  },
  {
    id: 'mystery2',
    name: '???',
    title: 'Mystery Investor',
    tags: ['???', '???', '???'],
    description: 'Another seasoned VC will be available soon.',
    available: false,
  },
];

export default function AgentSelectPage() {
  const router = useRouter();
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);

  const handleSelect = (agentId: string, available: boolean) => {
    if (!available || loadingAgent) return;
    
    setLoadingAgent(agentId);
    router.push(`/pitch/room?agent=${agentId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Back Button */}
        <Link 
          href="/about" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to About
        </Link>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
            Select Your Investor
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Choose who you'll be pitching to. Each investor has different expertise and temperament.
          </p>
        </motion.div>

        {/* Agent Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isLoading={loadingAgent === agent.id}
              onSelect={() => handleSelect(agent.id, agent.available)}
            />
          ))}
        </motion.div>
      </div>
    </main>
  );
}

function AgentCard({ agent, isLoading, onSelect }: { agent: any, isLoading: boolean, onSelect: () => void }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={agent.available && !isLoading ? { y: -5 } : agent.available ? {} : { x: [0, -2, 2, -2, 2, 0] }}
      transition={agent.available ? { duration: 0.2 } : { duration: 0.4 }}
      className={cn(
        "relative rounded-2xl backdrop-blur-xl p-8 transition-all duration-300 flex flex-col items-center text-center",
        agent.available 
          ? "bg-white/10 border-2 border-cyan-500/30 cursor-pointer hover:bg-white/[0.15] hover:border-cyan-500/60" 
          : "bg-white/5 border border-white/10 opacity-60",
        isLoading && "opacity-70 scale-[0.98] border-cyan-500"
      )}
      onClick={onSelect}
    >
      {/* Locked Badge */}
      {!agent.available && (
        <div className="absolute top-4 right-4 bg-gray-500/20 border border-gray-500/50 text-gray-400 px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Coming Soon
        </div>
      )}

      {/* Avatar */}
      <div className="mb-6">
        {agent.available ? (
          <VoicePitchOrb size={80} animate={!isLoading} />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-600/50 flex items-center justify-center">
             <div className="w-10 h-10 rounded-full bg-gray-700" />
          </div>
        )}
      </div>

      {/* Content */}
      <h3 className={cn(
        "text-2xl font-bold mb-1",
        agent.available ? "text-white" : "text-gray-500"
      )}>
        {agent.name}
      </h3>
      
      <p className={cn(
        "text-sm font-medium mb-4",
        agent.available ? "text-cyan-400" : "text-gray-500"
      )}>
        {agent.title}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {(Array.from(new Set(agent.tags ?? [])) as string[]).map((tag, i) => {
          const safeTag = typeof tag === 'string' ? tag.trim() : String(tag);
          return (
          <span key={`${safeTag || 'tag'}-${i}`} className={cn(
            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            agent.available 
              ? "bg-white/10 text-gray-300" 
              : "bg-white/5 text-gray-500"
          )}>
            {tag}
          </span>
          );
        })}
      </div>

      {/* Description */}
      <p className={cn(
        "text-sm leading-relaxed mb-8 flex-1",
        agent.available ? "text-gray-400" : "text-gray-500"
      )}>
        {agent.description}
      </p>

      {/* Action Button */}
      <div className="w-full">
        {isLoading ? (
          <div className="w-full py-3 bg-cyan-500/20 rounded-lg flex items-center justify-center gap-2 text-cyan-400 border border-cyan-500/30">
            <Loader2 className="w-5 h-5 animate-spin" />
            Entering...
          </div>
        ) : (
          <button
            disabled={!agent.available}
            className={cn(
              "w-full py-3 rounded-lg font-bold transition-all",
              agent.available
                ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
            )}
          >
            {agent.available ? "Select & Pitch" : "Locked"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

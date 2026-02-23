'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Eye, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { PitchDetailModal } from './PitchDetailModal';

interface PitchRow {
  id: string;
  username: string;
  agent: string;
  overall_score: number;
  duration_seconds: number | null;
  created_at: string;
}

const AGENT_NAMES: Record<string, string> = {
  marcus: "Marcus Chen",
};

function getAvatar(username: string): string {
  return username
    .split(/[_\s-]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export default function LeaderboardTable({ currentUserName }: { currentUserName?: string | null }) {
  const [rows, setRows] = useState<PitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPitchId, setViewPitchId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pitches")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.pitches)) {
          setRows(data.pitches);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-12 text-center">
        <p className="text-gray-400">No pitches yet. Be the first to pitch!</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider">Username</th>
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider">Score</th>
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider hidden md:table-cell">Investor</th>
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider hidden md:table-cell">Duration</th>
              <th className="px-6 py-4 text-gray-400 text-sm font-medium uppercase tracking-wider text-right">View</th>
            </tr>
          </thead>
          <motion.tbody
            variants={container}
            initial="hidden"
            animate="show"
          >
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const isCurrentUser = currentUserName?.toLowerCase() === row.username.toLowerCase();
              return (
                <motion.tr
                  key={row.id}
                  variants={item}
                  whileHover={{ scale: 1.005, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  className={`border-b border-white/5 transition-colors ${
                    isCurrentUser ? 'border-l-4 border-l-cyan-500 bg-cyan-500/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rank === 1 && <Trophy size={18} className="text-yellow-400" />}
                      {rank === 2 && <Medal size={18} className="text-gray-300" />}
                      {rank === 3 && <Medal size={18} className="text-amber-600" />}
                      <span className={`font-bold ${
                        rank === 1 ? 'text-yellow-400' :
                        rank === 2 ? 'text-gray-300' :
                        rank === 3 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        #{rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {getAvatar(row.username)}
                      </div>
                      <span className="text-white font-medium flex items-center gap-2">
                        {row.username}
                        {isCurrentUser && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded uppercase font-bold">You</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-cyan-400 font-bold text-lg">{row.overall_score}</span>
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
                          style={{ width: `${row.overall_score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300 hidden md:table-cell">{AGENT_NAMES[row.agent] || row.agent}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm hidden md:table-cell">{formatDuration(row.duration_seconds)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setViewPitchId(row.id)}
                      className="border border-cyan-500/50 text-cyan-400 px-3 py-1 rounded-lg text-sm hover:bg-cyan-500/20 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
      <PitchDetailModal pitchId={viewPitchId} onClose={() => setViewPitchId(null)} />
    </div>
  );
}

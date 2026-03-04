"use client";

import { useEffect, useState } from "react";
import LeaderboardTable from "@/components/LeaderboardTable";
import Link from "next/link";
import { toScore100 } from "@/lib/score";

interface Stats {
  totalPitches: number;
  topScore: number;
  activeUsers: number;
}

export default function LeaderboardPageClient({
  currentUserName,
}: {
  currentUserName?: string | null;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserName) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.profile?.username) setProfileUsername(d.profile.username);
        })
        .catch(() => {});
    }
  }, [currentUserName]);

  useEffect(() => {
    fetch("/api/leaderboard/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setStats({
            totalPitches: d.totalPitches ?? 0,
            topScore: d.topScore ?? 0,
            activeUsers: d.activeUsers ?? 0,
          });
        } else {
          setStats({ totalPitches: 0, topScore: 0, activeUsers: 0 });
        }
      })
      .catch(() => setStats({ totalPitches: 0, topScore: 0, activeUsers: 0 }));
  }, []);

  const statsDisplay = stats
    ? [
        { label: "Total Pitches", value: stats.totalPitches.toLocaleString() },
        { label: "Top Score", value: `${toScore100(stats.topScore)}/100` },
        { label: "Active Users", value: stats.activeUsers.toLocaleString() },
      ]
    : [
        { label: "Total Pitches", value: "—" },
        { label: "Top Score", value: "—" },
        { label: "Active Users", value: "—" },
      ];

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent inline-block">
            Global Leaderboard
          </h1>
          <p className="text-gray-400 text-lg mt-4">
            See how you rank against other founders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {statsDisplay.map((stat, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
            >
              <p className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <LeaderboardTable currentUserName={profileUsername ?? currentUserName} />

        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Want to improve your rank?</p>
          <Link
            href="/pitch/select"
            className="inline-block px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all"
          >
            Start a New Pitch
          </Link>
        </div>
      </div>
    </main>
  );
}

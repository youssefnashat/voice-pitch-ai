export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const [countRes, topRes, usersRes] = await Promise.all([
      sb.from("pitches").select("*", { count: "exact", head: true }).eq("published", true),
      sb.from("pitches").select("overall_score").eq("published", true).order("overall_score", { ascending: false }).limit(1).maybeSingle(),
      sb.from("pitches").select("user_id").eq("published", true).not("user_id", "is", null),
    ]);

    const totalPitches = countRes.count ?? 0;
    const topScore = topRes.data?.overall_score ?? 0;
    const pitchesWithUser = usersRes.data ?? [];
    const activeUsers = new Set(pitchesWithUser.map((p: { user_id: string | null }) => p.user_id).filter(Boolean)).size;

    return NextResponse.json({
      ok: true,
      totalPitches,
      topScore,
      activeUsers,
    });
  } catch (err: unknown) {
    console.error("[leaderboard/stats] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

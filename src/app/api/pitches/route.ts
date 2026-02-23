export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      agent,
      overall_score,
      dimensions,
      top_weakness,
      rewritten_opener,
      improved_answer,
      duration_seconds,
      transcript,
    } = body;

    if (overall_score == null) {
      return NextResponse.json(
        { ok: false, error: "overall_score is required" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    const { data: profile } = await sb
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (!profile?.username) {
      return NextResponse.json(
        { ok: false, error: "Profile required. Complete onboarding first.", code: "NO_PROFILE" },
        { status: 403 }
      );
    }

    const { data, error } = await sb
      .from("pitches")
      .insert({
        user_id: userId,
        username: profile.username,
        agent: agent || "marcus",
        overall_score,
        dimensions: dimensions || null,
        top_weakness: top_weakness ?? null,
        rewritten_opener: rewritten_opener ?? null,
        improved_answer: improved_answer ?? null,
        duration_seconds: duration_seconds ?? null,
        transcript:
          transcript != null
            ? typeof transcript === "string"
              ? transcript
              : JSON.stringify(transcript)
            : null,
        published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[pitches] insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pitch: data });
  } catch (err: unknown) {
    console.error("[pitches] POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack =
      process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(stack && { stack }) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("pitches")
      .select("id, username, agent, overall_score, duration_seconds, created_at")
      .eq("published", true)
      .order("overall_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[pitches] select error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pitches: data ?? [] });
  } catch (err: unknown) {
    console.error("[pitches] GET error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack =
      process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(stack && { stack }) },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing pitch id" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("pitches")
      .select(
        "id, username, agent, overall_score, dimensions, top_weakness, rewritten_opener, improved_answer, transcript, duration_seconds, created_at"
      )
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      console.error("[pitches/[id]] select error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Pitch not found" },
        { status: 404 }
      );
    }

    const pitch = {
      ...data,
      transcript:
        typeof data.transcript === "string" && data.transcript
          ? (() => {
              try {
                return JSON.parse(data.transcript);
              } catch {
                return null;
              }
            })()
          : data.transcript ?? null,
    };

    return NextResponse.json({ ok: true, pitch });
  } catch (err: unknown) {
    console.error("[pitches/[id]] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

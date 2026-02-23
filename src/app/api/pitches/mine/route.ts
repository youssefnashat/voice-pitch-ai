export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("pitches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[pitches/mine] error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const pitches = (data ?? []).map((p: Record<string, unknown>) => {
      const t = p.transcript;
      return {
        ...p,
        transcript:
          typeof t === "string" && t
            ? (() => {
                try {
                  return JSON.parse(t) as unknown;
                } catch {
                  return null;
                }
              })()
            : t ?? null,
      };
    });

    return NextResponse.json({ ok: true, pitches });
  } catch (err: unknown) {
    console.error("[pitches/mine] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

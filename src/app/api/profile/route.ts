export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: true, profile: null }, { status: 200 });
      }
      console.error("[profile] GET error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err: unknown) {
    console.error("[profile] GET error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { ok: false, error: "Username must be 3-20 characters, letters, numbers, underscores only" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    const { data, error } = await sb
      .from("profiles")
      .upsert(
        { id: userId, username },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, error: "Username already taken" }, { status: 409 });
      }
      console.error("[profile] POST error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err: unknown) {
    console.error("[profile] POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

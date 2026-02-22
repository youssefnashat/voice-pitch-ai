import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

function withErrorBoundary(
  inner: (req: NextRequest, ctx: any) => Promise<Response>
) {
  return async (req: NextRequest, ctx: any) => {
    try {
      return await inner(req, ctx);
    } catch (err) {
      console.error("[auth] unhandled error:", err);
      return NextResponse.json(
        { error: "Internal auth error. Check server logs." },
        { status: 500 }
      );
    }
  };
}

export const GET = withErrorBoundary(handler as any);
export const POST = withErrorBoundary(handler as any);

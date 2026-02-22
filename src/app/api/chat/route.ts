import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { ConversationHistory } from "@/types";

const isDev = process.env.NODE_ENV !== "production";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("[chat] GROQ_API_KEY is not set");
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY not set" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid or empty JSON body" },
        { status: 400 }
      );
    }

    let messages: ConversationHistory[];

    if (body.userMessage) {
      const history: ConversationHistory[] = Array.isArray(body.history)
        ? body.history
        : [];
      messages = [...history, { role: "user", content: body.userMessage }];
    } else if (body.message) {
      messages = [{ role: "user", content: body.message }];
    } else if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing message. Send { userMessage, history } or { message } or { messages }',
        },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("investorAgent");
    const result = await agent.generate(messages as any);

    const agentText =
      result.text || "That's an interesting point. Let me think about that.";

    return NextResponse.json({ ok: true, agentText });
  } catch (err) {
    console.error("[chat] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: isDev && err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

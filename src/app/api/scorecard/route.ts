import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { ScorecardRequest, Scorecard } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ScorecardRequest = await request.json();
    const { transcript, history } = body;

    // Prefer history (the clean, exact text the LLM processed) over raw STT transcript.
    // History has no interim entries, no garbled low-confidence text, no recovery noise.
    // Fall back to filtered transcript if history is unavailable.
    let formattedConversation: string;

    if (history && history.length > 0) {
      formattedConversation = history
        .map((entry) =>
          `${entry.role === "user" ? "Founder" : "Investor"}: ${entry.content}`
        )
        .join("\n");
    } else {
      // Fallback: strip interim, recovery, and rejected STT entries
      formattedConversation = transcript
        .filter(
          (e) =>
            !e.isInterim &&
            !e.recoveryTriggered &&
            e.wasAccepted !== false
        )
        .map((e) =>
          `${e.speaker === "user" ? "Founder" : "Investor"}: ${e.text}`
        )
        .join("\n");
    }

    if (!formattedConversation.trim()) {
      return NextResponse.json(
        { error: "No pitch content to evaluate" },
        { status: 400 }
      );
    }

    // Call evaluator agent through Mastra
    const agent = mastra.getAgent("evaluatorAgent");
    const result = await agent.generate([
      {
        role: "user",
        content: `Evaluate this startup pitch conversation. Base every score and piece of feedback strictly on what the Founder actually said — do not invent or assume anything.\n\n${formattedConversation}`,
      },
    ] as any);

    let scorecard: Scorecard;

    try {
      // Parse JSON from agent response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      scorecard = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse scorecard JSON:", parseError);
      console.error("Raw response:", result.text);

      // Return error with raw response for debugging
      return NextResponse.json(
        {
          error: "Failed to parse scorecard",
          raw: result.text,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error("Scorecard API error:", error);
    return NextResponse.json(
      { error: "Failed to generate scorecard" },
      { status: 500 }
    );
  }
}

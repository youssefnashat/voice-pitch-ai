import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { ConversationHistory, ConfidenceTier } from "@/types";

const isDev = process.env.NODE_ENV !== "production";

// ── Guardrail 1: Identity ─────────────────────────────────────────────────────
// Replace any named VC firm / investor reference with generic "my firm" / "a top investor"
const KNOWN_VC_ENTITIES: Record<string, string> = {
  "Sequoia": "my firm",
  "Andreessen Horowitz": "my firm",
  "a16z": "my firm",
  "Y Combinator": "a top accelerator",
  "YC": "a top accelerator",
  "Accel": "my firm",
  "Benchmark": "my firm",
  "Kleiner Perkins": "my firm",
  "General Catalyst": "my firm",
  "Greylock": "my firm",
  "Paul Graham": "a well-known investor",
  "Marc Andreessen": "a well-known investor",
  "Peter Thiel": "a well-known investor",
  "Sam Altman": "a well-known investor",
  "Reid Hoffman": "a well-known investor",
  "Bill Gurley": "a well-known investor",
  "Fred Wilson": "a well-known investor",
  "Ben Horowitz": "a well-known investor",
  "Tiger Global": "my firm",
  "SoftBank": "my firm",
  "Lightspeed": "my firm",
  "Index Ventures": "my firm",
  "Founders Fund": "my firm",
  "First Round Capital": "my firm",
  "Felicis": "my firm",
  "NEA": "my firm",
  "Insight Partners": "my firm",
  "Bessemer": "my firm",
  "Khosla": "my firm",
  "Battery Ventures": "my firm",
};

function applyIdentityGuardrail(text: string): string {
  let result = text;
  for (const [name, replacement] of Object.entries(KNOWN_VC_ENTITIES)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, replacement);
  }
  return result;
}

// ── Guardrail 2: Markdown stripping ──────────────────────────────────────────
// LLMs output markdown despite instructions — strip it all before TTS reads it
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")                        // ## headers
    .replace(/\*{3}([^*]+)\*{3}/g, "$1")              // ***bold+italic***
    .replace(/\*{2}([^*]+)\*{2}/g, "$1")              // **bold**
    .replace(/\*([^*]+)\*/g, "$1")                    // *italic*
    .replace(/`{3}[\s\S]*?`{3}/g, "")                 // ```code blocks```
    .replace(/`([^`]+)`/g, "$1")                      // `inline code`
    .replace(/^\s*[-*•·]\s+/gm, "")                   // - bullet points
    .replace(/^\s*\d+\.\s+/gm, "")                    // 1. numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")          // [link text](url)
    .replace(/_{2}([^_]+)_{2}/g, "$1")                // __underline__
    .replace(/\n{3,}/g, "\n\n")                       // excessive newlines
    .replace(/^>\s+/gm, "")                           // > blockquotes
    .trim();
}

// ── Guardrail 3: Filler / hedge stripping ────────────────────────────────────
// Strip conversational openers and hedging language the LLM uses despite instructions.
// Applied before length guardrail so it doesn't eat into the sentence budget.
const FILLER_OPENER_RE =
  /^(so[,.]?\s+|well[,.]?\s+|yeah[,.]?\s+|yep[,.]?\s+|great[,!]?\s+|interesting[.!,]?\s+|alright[,.]?\s+|look[,.]?\s+|listen[,.]?\s+|right[,.]?\s+|okay[,.]?\s*(so\s+)?|now[,.]?\s+|essentially[,.]?\s+|basically[,.]?\s+|i mean[,.]?\s+|you know[,.]?\s+|fair enough[.!,]?\s*|sure[.!,]\s+|got it[.!,]?\s+|understood[.!,]?\s+|makes sense[.!,]?\s+|absolutely[.!,]?\s+|of course[.!,]?\s+|certainly[.!,]?\s+|indeed[.!,]?\s+|honestly[,.]?\s+)/i;

function stripFillerOpeners(text: string): string {
  let result = text;
  // Apply up to 3 times to catch chained openers like "Well, okay so, ..."
  for (let i = 0; i < 3; i++) {
    const next = result.replace(FILLER_OPENER_RE, "");
    if (next === result) break;
    result = next;
  }
  // Re-capitalize after stripping
  return result.length > 0
    ? result.charAt(0).toUpperCase() + result.slice(1)
    : result;
}

// Strip inline hedging phrases that weaken the investor's authoritative voice
function stripHedges(text: string): string {
  return text
    .replace(/\bI think\s+(that\s+)?/gi, "")
    .replace(/\bI feel\s+(that\s+)?/gi, "")
    .replace(/\bI believe\s+(that\s+)?/gi, "")
    .replace(/\bperhaps\b/gi, "")
    .replace(/\bmaybe\b/gi, "")
    .replace(/\bsort of\b/gi, "")
    .replace(/\bkind of\b/gi, "")
    .replace(/\bbasically\b/gi, "")
    .replace(/\bessentially\b/gi, "")
    .replace(/\byou know\b/gi, "")
    .replace(/\s{2,}/g, " ")  // collapse double spaces left by removal
    .trim();
}

// ── Guardrail 4: Length ───────────────────────────────────────────────────────
// Enforce strict sentence count per phase — investors are concise
function truncateToSentences(text: string, max: number): string {
  const sentenceEndRegex = /[.!?]+[\s"')]*(?=[A-Z\s]|$)/g;
  let count = 0;
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    count++;
    lastEnd = match.index + match[0].length;
    if (count === max) break;
  }

  if (count < max) return text;
  return text.slice(0, lastEnd).trim();
}

function applyLengthGuardrail(text: string, phase: string): string {
  const maxSentences = phase === "negotiation" || phase === "close" ? 4 : 2;
  return truncateToSentences(text, maxSentences);
}

// ── Guardrail 4: Financial bounds ─────────────────────────────────────────────
// Valuation: $500K–$25M | Equity: 2%–35% | Check size: $50K–$3M
const BOUNDS = {
  valuation: { min: 500_000, max: 25_000_000 },
  equity: { min: 2, max: 35 },
  checkSize: { min: 50_000, max: 3_000_000 },
};

function formatDollar(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toLocaleString()}`;
}

function parseDollarValue(num: string, unit?: string): number {
  const n = parseFloat(num.replace(/,/g, ""));
  if (!unit) return n;
  if (/^M/i.test(unit)) return n * 1_000_000;
  if (/^K/i.test(unit)) return n * 1_000;
  if (/^B/i.test(unit)) return n * 1_000_000_000;
  return n;
}

function applyFinancialBoundsGuardrail(text: string): string {
  let modified = text;
  let wasClamped = false;

  modified = modified.replace(
    /\$(\d[\d,]*(?:\.\d+)?)\s*(M(?:illion)?|K|B(?:illion)?)?(?=\b|\s|,|\.)/gi,
    (match, numStr, unit) => {
      const value = parseDollarValue(numStr, unit);
      if (value <= 0) return match;

      if (value > BOUNDS.checkSize.max) {
        // Treat as valuation cap
        if (value < BOUNDS.valuation.min) { wasClamped = true; return formatDollar(BOUNDS.valuation.min); }
        if (value > BOUNDS.valuation.max) { wasClamped = true; return formatDollar(BOUNDS.valuation.max); }
      } else {
        // Treat as check size
        if (value < BOUNDS.checkSize.min) { wasClamped = true; return formatDollar(BOUNDS.checkSize.min); }
        if (value > BOUNDS.checkSize.max) { wasClamped = true; return formatDollar(BOUNDS.checkSize.max); }
      }
      return match;
    }
  );

  modified = modified.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, numStr) => {
    const value = parseFloat(numStr);
    if (value >= 1 && value <= 100) {
      if (value < BOUNDS.equity.min) { wasClamped = true; return `${BOUNDS.equity.min}%`; }
      if (value > BOUNDS.equity.max) { wasClamped = true; return `${BOUNDS.equity.max}%`; }
    }
    return match;
  });

  if (wasClamped) {
    modified = modified.trimEnd().replace(/[.!?]+$/, "");
    modified += " based on what I'm seeing at your stage.";
  }

  return modified;
}

// ── Guardrail 5: Off-topic ────────────────────────────────────────────────────
// Investor must stay on pitch topics — no generic filler words in this list
const ON_TOPIC_KEYWORDS = [
  "startup", "pitch", "invest", "market", "revenue", "customer", "traction",
  "product", "technology", "valuation", "equity", "raise", "round", "fund",
  "growth", "sales", "profit", "margin", "burn", "founder", "company",
  "model", "strategy", "competition", "moat", "scale", "retention",
  "acquisition", "cac", "ltv", "arr", "mrr", "saas", "gtm", "enterprise",
  "consumer", "deal", "term sheet", "cap table", "dilution", "runway",
  "million", "billion", "financial", "sector", "industry", "differentiator",
  "defensible", "distribution", "churn", "payback", "gross margin",
  "unit economics", "due diligence", "pilot", "contract", "signed",
  "impressed", "concern", "unclear", "prove", "evidence", "numbers",
  "metric", "kpi", "dashboard", "cohort", "nps",
];

function isOnTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return ON_TOPIC_KEYWORDS.some((kw) => lower.includes(kw));
}

function applyOffTopicGuardrail(text: string): string {
  if (isOnTopic(text)) return text;
  // Never echo raw user speech — it can be garbled, sensitive, or incomplete
  return "Let's keep our focus on the business. Walk me through your core value proposition.";
}

// ── Guardrail 6: Single question enforcement ──────────────────────────────────
// Investor must ask ONE focused question. Truncate after the first question mark.
function enforceOneQuestion(text: string): string {
  const firstQ = text.indexOf("?");
  if (firstQ === -1) return text; // no question at all — fine
  const afterFirst = text.slice(firstQ + 1).trim();
  if (!afterFirst.includes("?")) return text; // only one question — fine
  // Multiple questions detected — cut at first
  return text.slice(0, firstQ + 1).trim();
}

// ── Guardrail 7: Meta-commentary stripping ────────────────────────────────────
// Investor must NOT comment on the nature of a topic ("that's sensitive", "controversial", etc.)
// Strip the offending sentence and keep only the substantive business question/observation.
const META_COMMENTARY_RE =
  /[^.!?]*\b(sensitive|controversial|taboo|nsfw|touchy|delicate|tricky)\b[^.!?]*[.!?]\s*/gi;

function removeMetaCommentary(text: string): string {
  const cleaned = text.replace(META_COMMENTARY_RE, "").trim();
  if (!cleaned) {
    // Entire response was meta-commentary — replace with a grounding question
    return "Walk me through what your company does and who the customer is.";
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ── Sentiment delta ───────────────────────────────────────────────────────────
// Scores investor response tone — drives interestLevel on the client.
// Values are larger now so the bar visibly reacts to each turn.
function computeSentimentDelta(text: string): number {
  const lower = text.toLowerCase();

  // Decisive phase signals — large fixed swings
  if (lower.includes("think we can work together")) return 20;
  if (lower.includes("going to pass for now") || lower.includes("i'll pass")) return -20;
  if (lower.includes("scorecard is being generated")) return 0; // neutral close signal

  let score = 0;

  // Strong positive (investor genuinely impressed) — +15
  const strongPositives = [
    "that's actually impressive",
    "really impressive",
    "that's strong",
    "love that",
    "exactly right",
    "that's compelling",
    "solid answer",
    "smart approach",
    "strong signal",
    "that's what i want to hear",
    "now we're getting somewhere",
  ];
  for (const p of strongPositives) {
    if (lower.includes(p)) { score += 15; break; }
  }

  // Mild positive (acknowledging, neutral-positive) — +8
  const mildPositives = [
    "well said",
    "that makes sense",
    "great point",
    "that works",
    "i like that",
    "good point",
    "that's interesting",
    "fair enough",
    "reasonable",
    "appreciate that",
  ];
  if (score === 0) {
    for (const p of mildPositives) {
      if (lower.includes(p)) { score += 8; break; }
    }
  }

  // Strong negative (skeptical, calling out BS) — -15
  const strongNegatives = [
    "doesn't add up",
    "doesn't quite add up",
    "that doesn't add up",
    "not convinced",
    "strip the jargon",
    "red flag",
    "hand-wavy",
    "hard to believe",
    "skeptical",
    "that's a problem",
    "that worries me",
    "that's a red flag",
  ];
  for (const n of strongNegatives) {
    if (lower.includes(n)) { score -= 15; break; }
  }

  // Mild negative (probing, pushing back) — -8
  const mildNegatives = [
    "top-down tam",
    "top-down view",
    "what am i missing",
    "make the case",
    "that's a concern",
    "that concerns me",
    "without proof",
    "figure out later",
    "vague",
    "help me understand",
    "walk me through",
    "that doesn't quite",
  ];
  if (score === 0) {
    for (const n of mildNegatives) {
      if (lower.includes(n)) { score -= 8; break; }
    }
  }

  // Clamp: max +15 per turn, min -15
  return Math.max(-15, Math.min(15, score));
}

// ── Route handler ─────────────────────────────────────────────────────────────
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

    const phase: string = body.phase ?? "pitch";
    const lastPitchTopic: string = body.lastPitchTopic ?? "";
    const confidenceTier: ConfidenceTier = body.confidenceTier ?? "high";

    let messages: ConversationHistory[];

    if (body.userMessage) {
      const history: ConversationHistory[] = Array.isArray(body.history)
        ? body.history
        : [];

      let userContent: string = body.userMessage;

      // Pitch-phase greeting guard: if founder's first message is very short or
      // greeting-like, tell the investor to wait — not pepper them with questions.
      const wordCount = userContent.trim().split(/\s+/).length;
      const isGreeting = /^(hey|hi|hello|yo|sup|what'?s up|hiya|howdy)[^a-z]*/i.test(userContent.trim());
      if (phase === "pitch" && (wordCount < 8 || isGreeting)) {
        userContent =
          `[System: The founder has not pitched yet or is still opening. Do NOT ask any questions. Respond with a single short sentence acknowledging you are ready, then stop. Wait for the pitch.] ` +
          userContent;
      }

      // Incoherent/incomplete sentence guard: if message is fragmentary, ask for a redo
      const hasVerb = /\b(is|are|was|were|do|does|did|have|has|had|will|would|can|could|should|may|might|build|solve|help|make|create|offer|provide|sell|serve)\b/i.test(userContent);
      if (wordCount >= 4 && wordCount < 12 && !hasVerb && phase !== "pitch") {
        userContent =
          `[System: The founder's message appears incomplete or unclear. Ask them to restate that point clearly.] ` +
          userContent;
      }

      // Server-side confidence guardrail: inject note for medium-confidence turns
      if (confidenceTier === "medium") {
        userContent =
          `[Note: transcription confidence is moderate — if the founder's statement seems unclear, ask them to clarify rather than assuming.] ` +
          userContent;
      }

      messages = [...history, { role: "user", content: userContent }];
    } else if (body.message) {
      messages = [{ role: "user", content: body.message }];
    } else if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing message. Send { userMessage, history } or { message } or { messages }",
        },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("investorAgent");
    const result = await agent.generate(messages as any);

    let agentText =
      result.text || "That's an interesting point. Let me think about that.";

    // ── Apply guardrails in order ────────────────────────────────────────────
    // 1. Strip markdown — must run first so downstream guardrails see clean text
    agentText = stripMarkdown(agentText);

    // 2. Strip filler openers and hedging language
    agentText = stripFillerOpeners(agentText);
    agentText = stripHedges(agentText);

    // 3. Remove meta-commentary ("that's a sensitive topic", "controversial", etc.)
    agentText = removeMetaCommentary(agentText);

    // 4. Identity — replace real VC/investor names with generic terms
    agentText = applyIdentityGuardrail(agentText);

    // 5. Off-topic — redirect to pitch (never echoes raw user speech)
    agentText = applyOffTopicGuardrail(agentText);

    // 6. Financial bounds — clamp $ amounts and equity % to valid ranges
    agentText = applyFinancialBoundsGuardrail(agentText);

    // 7. Single question — truncate to first "?" if investor asked multiple
    agentText = enforceOneQuestion(agentText);

    // 8. Length — hard truncation to sentence limit for current phase
    agentText = applyLengthGuardrail(agentText, phase);

    const sentimentDelta = computeSentimentDelta(agentText);

    return NextResponse.json({ ok: true, agentText, sentimentDelta });
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

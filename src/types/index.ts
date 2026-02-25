// Data schemas for VoicePitch app

export type Phase = "landing" | "pitch" | "qa" | "negotiation" | "close" | "scorecard";
export type Speaker = "user" | "investor";
export type Role = "user" | "assistant";
export type ConfidenceTier = "high" | "medium" | "low";

export interface CurrentOffer {
  valuation: number;
  checkSize: number;
  equity: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
  isInterim?: boolean;
  // Confidence fields (populated for user entries from STT)
  confidence?: number;
  confidenceTier?: ConfidenceTier;
  wasAccepted?: boolean;
  recoveryTriggered?: boolean;
}

export interface ConversationHistory {
  role: Role;
  content: string;
}

export interface DimensionScore {
  score: number;
  feedback: string;
}

export interface Scorecard {
  overall_score: number;
  dimensions: {
    clarity: DimensionScore;
    market: DimensionScore;
    traction: DimensionScore;
    unit_economics: DimensionScore;
    delivery: DimensionScore;
  };
  top_weakness: string;
  rewritten_opener: string;
  improved_answer: string;
}

export interface ChatRequest {
  userMessage: string;
  history: ConversationHistory[];
  phase?: Phase;
  lastPitchTopic?: string;
  qaExchangeCount?: number;
  confidenceTier?: ConfidenceTier;
  currentOffer?: CurrentOffer | null;
}

export interface ChatResponse {
  agentText: string;
  audioUrl?: string;
}

export interface ScorecardRequest {
  transcript: TranscriptEntry[];
  history?: ConversationHistory[];
}

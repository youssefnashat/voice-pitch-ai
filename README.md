# VoicePitch v2 — AI Voice Pitch Simulator

A voice-first startup pitch simulator powered by **Smallest AI** (real-time WebSocket STT), **ElevenLabs** (premium TTS), **Groq Llama 3.3 70B** (fast LLM), and **Mastra** (agent orchestration). Users deliver a live pitch to an AI investor agent (Marcus Chen) who challenges and questions in real-time voice. After 3-4 exchanges, users get a structured scorecard.

**Hackathon:** AI Agents Voice Hackathon (Kitchener, Feb 13-15, 2026)

---

## Architecture

```
User speaks -> Smallest AI Pulse STT (WebSocket, ~64ms) -> Text
                    |
          Mastra Agent (Groq LLM via Mastra) -> Response text
                    |
          ElevenLabs TTS (Streaming HTTP) -> Audio
```

---

## Key Features

- **Real-Time STT** — Smallest AI Pulse WebSocket (16kHz PCM, ~64ms latency)
- **Premium TTS** — ElevenLabs streaming via server route (eleven_turbo_v2_5)
- **Fast LLM** — Groq Llama 3.3 70B (~280 tok/s) via Mastra agents
- **Structured Feedback** — Post-call scorecard (clarity, market, traction, unit economics, delivery)
- **Auto-Fallback** — STT falls back to browser SpeechRecognition, TTS falls back to browser speechSynthesis
- **Silence Detection** — 5s warning, 15s auto-end turn
- **LLM Timeout UI** — "Marcus is thinking..." (8s) / "still thinking..." (15s)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript strict mode
- **STT:** Smallest AI Pulse (WebSocket) with browser SpeechRecognition fallback
- **TTS:** ElevenLabs (server-side via `/api/tts`) with browser speechSynthesis fallback
- **LLM:** Groq Llama 3.3 70B via Mastra agents
- **Styling:** Tailwind CSS v4 + Framer Motion

---

## Setup

### Prerequisites
- Node.js 18+ and npm
- Groq API key ([groq.com](https://groq.com))
- Smallest AI API key ([smallest.ai](https://smallest.ai))
- ElevenLabs API key ([elevenlabs.io](https://elevenlabs.io))

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SMALLEST_API_KEY=your_smallest_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
NEXT_PUBLIC_USE_SMALLEST_STT=true
NEXT_PUBLIC_USE_ELEVENLABS_TTS=true
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Sends user message + history to Mastra investorAgent, returns `{ agentText }` JSON |
| `/api/tts` | POST | Sends `{ text }` to ElevenLabs, returns audio/mpeg stream |
| `/api/scorecard` | POST | Sends transcript to Mastra evaluatorAgent, returns scorecard JSON |

---

## File Structure

```
src/
├── mastra/
│   ├── index.ts
│   └── agents/
│       ├── investor-agent.ts
│       └── evaluator-agent.ts
├── app/api/
│   ├── chat/route.ts          <- LLM only (JSON response)
│   ├── tts/route.ts           <- ElevenLabs TTS (audio response)
│   └── scorecard/route.ts
├── components/
│   ├── PitchRoom.tsx           <- main orchestrator
│   ├── MarcusAvatar.tsx
│   ├── StatusHUD.tsx
│   ├── LiveDeckFeed.tsx
│   ├── TranscriptPanel.tsx
│   └── Scorecard.tsx
├── hooks/
│   ├── useSession.ts           <- merged STT + TTS + session state
│   ├── useSmallestSTT.ts       <- Smallest AI Pulse WebSocket STT
│   ├── useElevenLabsTTS.ts     <- ElevenLabs TTS via /api/tts
│   ├── useSpeechRecognition.ts <- browser STT (legacy fallback)
│   └── useAudioPlayback.ts     <- browser TTS (legacy fallback)
├── lib/
│   └── voice-config.ts         <- runtime config + feature flags
└── types/
    └── index.ts
```

---

## Error Recovery

- **Smallest AI STT fails:** Auto-fallback to browser SpeechRecognition
- **ElevenLabs TTS fails:** Auto-fallback to browser speechSynthesis
- **LLM slow (8s):** "Marcus is thinking..." UI
- **LLM stall (15s):** "Marcus is still thinking..." + stall message fallback
- **5s silence:** "Still listening..." warning banner
- **15s silence:** Auto-end turn

---

## Runtime Feature Flags

Toggle via `localStorage` in browser console:

```js
localStorage.setItem('forceSmallestSTT', 'false')  // disable Smallest STT
localStorage.setItem('forceElevenTTS', 'false')     // disable ElevenLabs TTS
```

---

---

## Supabase Migrations

Run these in the Supabase SQL editor. Use TEXT for user ids (NextAuth Credentials provider returns non-UUID strings).

**If tables don't exist yet:**
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.pitches ADD COLUMN IF NOT EXISTS transcript text;
```

**If you have UUID columns and need to migrate to TEXT:**
```sql
ALTER TABLE public.profiles ALTER COLUMN id TYPE text;
ALTER TABLE public.pitches ALTER COLUMN user_id TYPE text;
```

---

## Resources

- **Smallest AI:** https://smallest.ai/docs
- **ElevenLabs:** https://elevenlabs.io/docs
- **Groq:** https://groq.com/docs
- **Mastra:** https://mastra.ai/docs

---

## License

MIT. Built during AI Agents Voice Hackathon, Feb 13-15, 2026.

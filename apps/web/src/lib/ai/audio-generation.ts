// Audio generation module — music via Replicate MusicGen, voice via ElevenLabs
// Exports: generateMusic(), generateVoice()

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MusicGenerationParams {
  genre: string;
  mood: string;
  bpm: number;
  durationSeconds: number;
}

interface VoiceGenerationParams {
  text: string;
  voiceId?: string;
  style: string;
  speed: number;
  pitch: number;
}

interface AudioResult {
  audioUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Music generation (Replicate MusicGen)                              */
/* ------------------------------------------------------------------ */

export async function generateMusic(params: MusicGenerationParams): Promise<AudioResult> {
  const prompt = `${params.genre} music, ${params.mood} mood, ${params.bpm} BPM`;

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: process.env.REPLICATE_MUSIC_MODEL || 'musicgen-large-latest',
      input: {
        prompt,
        duration: params.durationSeconds,
        temperature: 1.0,
        top_k: 250,
        top_p: 0.0,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Music generation failed: ${error}`);
  }

  const prediction = await response.json();

  // MusicGen returns a synchronous result when using the predictions endpoint
  // with a webhook or we poll until complete.
  const audioUrl = await waitForPrediction(prediction.id);
  return { audioUrl };
}

/* ------------------------------------------------------------------ */
/*  Voice generation (ElevenLabs)                                      */
/* ------------------------------------------------------------------ */

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — default fallback

export async function generateVoice(params: VoiceGenerationParams): Promise<AudioResult> {
  const voiceId = params.voiceId || DEFAULT_VOICE_ID;

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: params.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: params.style === 'expressive' ? 0.8 : 0.3,
        speed: params.speed,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voice generation failed: ${error}`);
  }

  // ElevenLabs returns raw audio bytes — convert to a data URL for client use.
  // In production this would upload to object storage and return a CDN URL.
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  return { audioUrl };
}

/* ------------------------------------------------------------------ */
/*  Internal: poll Replicate prediction until complete                  */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 150; // ~5 minutes

async function waitForPrediction(predictionId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      },
    );

    if (!response.ok) throw new Error('Failed to poll music generation job');

    const prediction = await response.json();

    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      return typeof output === 'string' ? output : output?.[0] ?? '';
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Music generation failed');
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Music generation timed out');
}

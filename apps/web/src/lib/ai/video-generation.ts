// Video generation module using Replicate API
// Exports: generateVideo(), pollVideoJob(), buildEnhancedPrompt()

interface VideoGenerationParams {
  prompt: string;
  styleFingerprint?: Record<string, any>;
  characterEmbedding?: string;
  cameraType: string;
  motionStyle: string;
  durationSeconds: number;
  aspectRatio: string;
}

interface VideoGenerationResult {
  jobId: string;
  pollUrl: string;
}

export async function generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
  const enhancedPrompt = buildEnhancedPrompt(params);

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: process.env.REPLICATE_VIDEO_MODEL || 'cogvideox-5b-latest',
      input: {
        prompt: enhancedPrompt,
        num_frames: Math.round(params.durationSeconds * 24),
        fps: 24,
        guidance_scale: 6,
        num_inference_steps: 50,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Video generation failed: ${error}`);
  }

  const prediction = await response.json();
  return { jobId: prediction.id, pollUrl: prediction.urls?.get || '' };
}

export async function pollVideoJob(
  replicateJobId: string,
): Promise<{ status: string; outputUrl?: string; error?: string }> {
  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${replicateJobId}`,
    {
      headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    },
  );

  if (!response.ok) throw new Error('Failed to poll video job');

  const prediction = await response.json();

  if (prediction.status === 'succeeded') {
    return { status: 'complete', outputUrl: prediction.output?.[0] };
  }
  if (prediction.status === 'failed') {
    return { status: 'failed', error: prediction.error || 'Video generation failed' };
  }
  return { status: 'processing' };
}

export function buildEnhancedPrompt(params: VideoGenerationParams): string {
  let prompt = params.prompt;
  if (params.cameraType) prompt += `, ${params.cameraType} camera angle`;
  if (params.motionStyle) prompt += `, ${params.motionStyle} motion`;
  if (params.styleFingerprint) {
    const style = params.styleFingerprint;
    if (style.colorPalette) prompt += `, ${style.colorPalette} color palette`;
    if (style.renderStyle) prompt += `, ${style.renderStyle} style`;
  }
  return prompt;
}

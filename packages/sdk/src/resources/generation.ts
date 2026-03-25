import type { HttpClient } from '../http';
import type {
  GenerationResult,
  VideoGenerationParams,
  AudioGenerationParams,
  AvatarGenerationParams,
  StyleCloneParams,
  ImgToCartoonParams,
  ScriptGenerationParams,
} from '../types';

export class GenerationResource {
  constructor(private readonly http: HttpClient) {}

  async video(params: VideoGenerationParams): Promise<GenerationResult> {
    return this.http.post('/generate/video', params);
  }

  async audio(params: AudioGenerationParams): Promise<GenerationResult> {
    return this.http.post('/generate/audio', params);
  }

  async avatar(params: AvatarGenerationParams): Promise<GenerationResult> {
    return this.http.post('/generate/avatar', params);
  }

  async styleClone(params: StyleCloneParams): Promise<GenerationResult> {
    return this.http.post('/generate/style-clone', params);
  }

  async imgToCartoon(params: ImgToCartoonParams): Promise<GenerationResult> {
    return this.http.post('/generate/img-to-cartoon', params);
  }

  async script(params: ScriptGenerationParams): Promise<GenerationResult> {
    return this.http.post('/generate/script', params);
  }
}

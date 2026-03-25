import { HttpClient } from './http';
import { ProjectsResource } from './resources/projects';
import { ShotsResource } from './resources/shots';
import { CharactersResource } from './resources/characters';
import { GenerationResource } from './resources/generation';
import { JobsResource } from './resources/jobs';
import { AssetsResource } from './resources/assets';
import type { ClientConfig } from './types';

export class AnimaForgeClient {
  public readonly projects: ProjectsResource;
  public readonly shots: ShotsResource;
  public readonly characters: CharactersResource;
  public readonly generate: GenerationResource;
  public readonly jobs: JobsResource;
  public readonly assets: AssetsResource;

  private readonly http: HttpClient;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required to create an AnimaForgeClient');
    }

    this.http = new HttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });

    this.projects = new ProjectsResource(this.http);
    this.shots = new ShotsResource(this.http);
    this.characters = new CharactersResource(this.http);
    this.generate = new GenerationResource(this.http);
    this.jobs = new JobsResource(this.http);
    this.assets = new AssetsResource(this.http);
  }
}

import type { HttpClient } from '../http';
import type {
  Character,
  CreateCharacterData,
  UpdateCharacterData,
  ListCharactersParams,
  PaginatedResponse,
} from '../types';

export class CharactersResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: ListCharactersParams): Promise<PaginatedResponse<Character>> {
    return this.http.get('/characters', params as Record<string, string | number | boolean | undefined>);
  }

  async get(id: string): Promise<Character> {
    return this.http.get(`/characters/${id}`);
  }

  async create(data: CreateCharacterData): Promise<Character> {
    return this.http.post('/characters', data);
  }

  async update(id: string, data: UpdateCharacterData): Promise<Character> {
    return this.http.patch(`/characters/${id}`, data);
  }

  async createTwin(id: string, photos: string[]): Promise<Character> {
    return this.http.post(`/characters/${id}/twin`, { photos });
  }
}

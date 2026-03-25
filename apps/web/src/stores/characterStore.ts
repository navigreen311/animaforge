import { create } from 'zustand';
import type { Character } from '@/types';

/* ------------------------------------------------------------------ */
/*  Character Store                                                     */
/* ------------------------------------------------------------------ */

interface CharacterState {
  characters: Character[];
  activeCharacter: Character | null;
  isLoading: boolean;
}

interface CharacterActions {
  fetchCharacters: (projectId: string) => void;
  createCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  setActiveCharacter: (id: string) => void;
  triggerTwinCreation: (id: string, photos: string[]) => void;
}

export const useCharacterStore = create<CharacterState & CharacterActions>(
  (set, get) => ({
    characters: [],
    activeCharacter: null,
    isLoading: false,

    fetchCharacters: (projectId) => {
      set({ isLoading: true });

      // Mock API call — replaced with real fetch in production
      setTimeout(() => {
        const mockCharacters: Character[] = [
          {
            id: 'char-1',
            projectId,
            name: 'Commander Shaw',
            description: 'Veteran space commander leading the Europa expedition.',
            styleMode: 'realistic',
            isDigitalTwin: true,
            referenceImages: ['/placeholders/shaw-ref-1.png'],
            voiceProfileId: 'eleven_shaw_v2',
            bodyParams: { height: '182cm', build: 'athletic' },
            hairParams: { style: 'buzz_cut', color: '#1A1A1A' },
            wardrobeDescription: 'EVA suit (blue) or station jumpsuit',
            traits: ['determined', 'calm under pressure', 'empathetic'],
            twinReconstructionStatus: 'complete',
            avatarUrl: '/placeholders/shaw-avatar.png',
            createdAt: '2026-03-10T08:00:00Z',
            updatedAt: '2026-03-20T12:00:00Z',
          },
          {
            id: 'char-2',
            projectId,
            name: 'Dr. Lin',
            description: 'Xenobiologist and lead scientist on the Europa mission.',
            styleMode: 'realistic',
            isDigitalTwin: true,
            referenceImages: ['/placeholders/lin-ref-1.png'],
            voiceProfileId: 'eleven_lin_v1',
            bodyParams: { height: '165cm', build: 'slim' },
            hairParams: { style: 'shoulder_length', color: '#0D0D0D' },
            wardrobeDescription: 'Lab coat or arctic parka',
            traits: ['brilliant', 'curious', 'cautious'],
            twinReconstructionStatus: 'complete',
            avatarUrl: '/placeholders/lin-avatar.png',
            createdAt: '2026-03-10T09:00:00Z',
            updatedAt: '2026-03-21T10:00:00Z',
          },
        ];
        set({ characters: mockCharacters, isLoading: false });
      }, 500);
    },

    createCharacter: (data) => {
      const now = new Date().toISOString();
      const newCharacter: Character = {
        ...data,
        id: `char-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        characters: [...state.characters, newCharacter],
      }));
    },

    updateCharacter: (id, data) =>
      set((state) => {
        const updated = state.characters.map((c) =>
          c.id === id
            ? { ...c, ...data, updatedAt: new Date().toISOString() }
            : c,
        );
        return {
          characters: updated,
          activeCharacter:
            state.activeCharacter?.id === id
              ? { ...state.activeCharacter, ...data, updatedAt: new Date().toISOString() }
              : state.activeCharacter,
        };
      }),

    deleteCharacter: (id) =>
      set((state) => ({
        characters: state.characters.filter((c) => c.id !== id),
        activeCharacter:
          state.activeCharacter?.id === id ? null : state.activeCharacter,
      })),

    setActiveCharacter: (id) =>
      set((state) => ({
        activeCharacter:
          state.characters.find((c) => c.id === id) ?? null,
      })),

    triggerTwinCreation: (id, photos) => {
      // Mark the character as processing
      set((state) => ({
        characters: state.characters.map((c) =>
          c.id === id
            ? { ...c, twinPhotos: photos, twinReconstructionStatus: 'processing' as const }
            : c,
        ),
      }));

      // Simulate async twin reconstruction pipeline
      setTimeout(() => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  twinReconstructionStatus: 'complete' as const,
                  avatarUrl: `/outputs/twin-${id}-${Date.now()}.png`,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
      }, 4000);
    },
  }),
);

import { create } from 'zustand';
import type { StyleFingerprint } from '@/types';

/* ------------------------------------------------------------------ */
/*  Style Studio Store                                                 */
/* ------------------------------------------------------------------ */

export interface StylePack {
  id: string;
  name: string;
  thumbnailUrl: string;
  creator: string;
  sourceType: 'video' | 'animation';
  price: number;
  fingerprintId: string;
}

export interface CartoonResult {
  beforeUrl: string;
  afterUrl: string;
  style: CartoonStyle;
  strength: number;
}

export type CartoonStyle = 'cartoon' | 'anime' | 'cel' | 'pixel art';

interface StyleState {
  stylePacks: StylePack[];
  activeFingerprint: StyleFingerprint | null;
  cloneJobId: string | null;
  isCloning: boolean;
  cartoonJobId: string | null;
  cartoonResult: CartoonResult | null;
}

interface StyleActions {
  cloneStyle: (sourceUrl: string, sourceType: 'video' | 'animation') => void;
  applyStyle: (contentUrl: string, fingerprintId: string, strength: number) => void;
  convertToCartoon: (imageUrl: string, style: CartoonStyle, strength: number) => void;
  fetchStyleLibrary: () => void;
  setActiveFingerprint: (id: string) => void;
}

export const useStyleStore = create<StyleState & StyleActions>((set, get) => ({
  stylePacks: [],
  activeFingerprint: null,
  cloneJobId: null,
  isCloning: false,
  cartoonJobId: null,
  cartoonResult: null,

  cloneStyle: (sourceUrl, sourceType) => {
    const jobId = `clone-${Date.now()}`;
    set({ cloneJobId: jobId, isCloning: true });

    // Simulate async extraction — replaced with real API call in production
    setTimeout(() => {
      const fingerprint: StyleFingerprint = {
        id: `fp-${Date.now()}`,
        name: `Cloned from ${sourceType}`,
        baseModel: 'sd-xl-1.0',
        loraWeights: undefined,
        samplerSettings: {},
        referenceImages: [sourceUrl],
        tags: [sourceType, 'cloned'],
      };
      set({ activeFingerprint: fingerprint, isCloning: false });
    }, 2000);
  },

  applyStyle: (contentUrl, fingerprintId, strength) => {
    // Placeholder: would call the style-transfer API
    console.log('[StyleStore] applyStyle', { contentUrl, fingerprintId, strength });
  },

  convertToCartoon: (imageUrl, style, strength) => {
    const jobId = `cartoon-${Date.now()}`;
    set({ cartoonJobId: jobId, cartoonResult: null });

    // Simulate 7-stage pipeline
    setTimeout(() => {
      set({
        cartoonResult: {
          beforeUrl: imageUrl,
          afterUrl: imageUrl,
          style,
          strength,
        },
      });
    }, 3000);
  },

  fetchStyleLibrary: () => {
    // Placeholder: would call the marketplace API
    const mockPacks: StylePack[] = [
      {
        id: 'sp-1',
        name: 'Ghibli Watercolor',
        thumbnailUrl: '/placeholders/style-ghibli.png',
        creator: 'AnimaForge',
        sourceType: 'animation',
        price: 0,
        fingerprintId: 'fp-ghibli',
      },
      {
        id: 'sp-2',
        name: 'Noir Cinematic',
        thumbnailUrl: '/placeholders/style-noir.png',
        creator: 'StudioDark',
        sourceType: 'video',
        price: 4.99,
        fingerprintId: 'fp-noir',
      },
      {
        id: 'sp-3',
        name: 'Retro Pixel',
        thumbnailUrl: '/placeholders/style-pixel.png',
        creator: 'PixelCraft',
        sourceType: 'animation',
        price: 2.99,
        fingerprintId: 'fp-pixel',
      },
      {
        id: 'sp-4',
        name: 'Cyberpunk Neon',
        thumbnailUrl: '/placeholders/style-cyber.png',
        creator: 'NeonLab',
        sourceType: 'video',
        price: 0,
        fingerprintId: 'fp-cyber',
      },
    ];
    set({ stylePacks: mockPacks });
  },

  setActiveFingerprint: (id) => {
    const pack = get().stylePacks.find((p) => p.fingerprintId === id);
    if (pack) {
      set({
        activeFingerprint: {
          id,
          name: pack.name,
          baseModel: 'sd-xl-1.0',
          samplerSettings: {},
          referenceImages: [pack.thumbnailUrl],
          tags: [pack.sourceType],
        },
      });
    }
  },
}));

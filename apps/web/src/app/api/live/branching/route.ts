import { NextRequest, NextResponse } from 'next/server';

const MOCK_NARRATIVES = [
  {
    id: 'narr_1',
    name: 'Hero Arc',
    scenes: [
      {
        id: 'scene_1',
        narrativeId: 'narr_1',
        name: 'Opening',
        triggerType: 'auto',
        emotion: 'neutral',
        pose: 'idle',
        position: { x: 0, y: 0 },
      },
      {
        id: 'scene_2',
        narrativeId: 'narr_1',
        name: 'Conflict',
        triggerType: 'chat-keyword',
        emotion: 'angry',
        pose: 'combat',
        position: { x: 200, y: 100 },
      },
      {
        id: 'scene_3',
        narrativeId: 'narr_1',
        name: 'Resolution',
        triggerType: 'donation',
        emotion: 'happy',
        pose: 'celebrate',
        position: { x: 400, y: 0 },
      },
    ],
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    narratives: MOCK_NARRATIVES,
    total: MOCK_NARRATIVES.length,
  });
}

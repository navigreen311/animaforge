import { NextResponse } from 'next/server';

export async function GET() {
  const styles = [
    {
      id: 'style_001',
      name: 'Cyberpunk Neon',
      description: 'High-contrast neon lighting with dark urban backdrops',
      thumbnailUrl: '/mock-thumbnails/cyberpunk-neon.jpg',
      tags: ['sci-fi', 'neon', 'urban'],
    },
    {
      id: 'style_002',
      name: 'Studio Ghibli Watercolor',
      description: 'Soft watercolor aesthetic inspired by hand-painted animation',
      thumbnailUrl: '/mock-thumbnails/ghibli-watercolor.jpg',
      tags: ['anime', 'watercolor', 'fantasy'],
    },
    {
      id: 'style_003',
      name: 'Noir Cinematic',
      description: 'Black-and-white dramatic lighting with film grain',
      thumbnailUrl: '/mock-thumbnails/noir-cinematic.jpg',
      tags: ['noir', 'cinematic', 'dramatic'],
    },
  ];

  return NextResponse.json({ styles, total: styles.length });
}

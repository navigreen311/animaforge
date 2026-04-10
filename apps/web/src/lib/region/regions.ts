export interface Region {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  endpoint: string;
  status: 'operational' | 'degraded' | 'down';
}

export const REGIONS: Region[] = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', city: 'Ashburn', country: 'USA', flag: '🇺🇸', endpoint: 'https://us-east.animaforge.com', status: 'operational' },
  { id: 'us-west-2', name: 'US West (Oregon)', city: 'Portland', country: 'USA', flag: '🇺🇸', endpoint: 'https://us-west.animaforge.com', status: 'operational' },
  { id: 'eu-west-1', name: 'EU West (Ireland)', city: 'Dublin', country: 'Ireland', flag: '🇮🇪', endpoint: 'https://eu-west.animaforge.com', status: 'operational' },
  { id: 'eu-central-1', name: 'EU Central (Frankfurt)', city: 'Frankfurt', country: 'Germany', flag: '🇩🇪', endpoint: 'https://eu-central.animaforge.com', status: 'operational' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', city: 'Singapore', country: 'Singapore', flag: '🇸🇬', endpoint: 'https://ap-southeast.animaforge.com', status: 'operational' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', endpoint: 'https://ap-northeast.animaforge.com', status: 'operational' },
];

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

const STORAGE_KEY = 'animaforge_region';

export function getStoredRegion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredRegion(regionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, regionId);
}

const MOCK_LATENCIES: Record<string, number> = {
  'us-east-1': 45,
  'us-west-2': 80,
  'eu-west-1': 120,
  'eu-central-1': 130,
  'ap-southeast-1': 220,
  'ap-northeast-1': 240,
};

export async function pingRegion(region: Region): Promise<number> {
  await new Promise((r) => setTimeout(r, 50));
  return Math.round((MOCK_LATENCIES[region.id] || 200) + Math.random() * 30);
}

export async function detectFastestRegion(): Promise<{ region: Region; latency: number }[]> {
  const results = await Promise.all(REGIONS.map(async (r) => ({ region: r, latency: await pingRegion(r) })));
  return results.sort((a, b) => a.latency - b.latency);
}

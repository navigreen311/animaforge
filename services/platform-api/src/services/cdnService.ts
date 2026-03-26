import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface Distribution {
  distributionId: string;
  projectId: string;
  domain: string;
  status: string;
  createdAt: string;
}

export interface Invalidation {
  invalidationId: string;
  distributionId: string;
  paths: string[];
  status: string;
  createdAt: string;
}

export interface AdaptiveBitrateConfig {
  assetId: string;
  manifestUrl: string;
  qualities: string[];
}

export interface DeliveryMetrics {
  distributionId: string;
  bandwidth_gb: number;
  requests: number;
  cache_hit_rate: number;
  p95_latency_ms: number;
}

export interface EdgeLocation {
  id: string;
  region: string;
  city: string;
}

// In-memory stores
const distributions: Map<string, Distribution> = new Map();
const invalidations: Map<string, Invalidation> = new Map();
const metrics: Map<string, DeliveryMetrics> = new Map();

export function resetStore(): void {
  distributions.clear();
  invalidations.clear();
  metrics.clear();
}

export function createDistribution(projectId: string): Distribution {
  const distributionId = uuidv4();
  const dist: Distribution = {
    distributionId,
    projectId,
    domain: "cdn.animaforge.com",
    status: "deployed",
    createdAt: new Date().toISOString(),
  };

  distributions.set(distributionId, dist);

  // Initialize metrics for this distribution
  metrics.set(distributionId, {
    distributionId,
    bandwidth_gb: 0,
    requests: 0,
    cache_hit_rate: 0.95,
    p95_latency_ms: 42,
  });

  return dist;
}

export function invalidateCache(
  distributionId: string,
  paths: string[],
): Invalidation {
  const dist = distributions.get(distributionId);
  if (!dist) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      "Distribution not found",
    );
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const invalidation: Invalidation = {
    invalidationId: uuidv4(),
    distributionId,
    paths,
    status: "in_progress",
    createdAt: new Date().toISOString(),
  };

  invalidations.set(invalidation.invalidationId, invalidation);
  return invalidation;
}

export function getDeliveryUrl(
  assetKey: string,
  options: { quality?: string; signed?: boolean; expiresIn?: number } = {},
): string {
  const base = `https://cdn.animaforge.com/assets/${assetKey}`;
  const params: string[] = [];

  if (options.quality) {
    params.push(`q=${options.quality}`);
  }

  if (options.signed) {
    const expiresIn = options.expiresIn ?? 3600;
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const token = crypto
      .createHmac("sha256", "animaforge-cdn-secret")
      .update(`${assetKey}:${expires}`)
      .digest("hex")
      .substring(0, 16);
    params.push(`expires=${expires}`);
    params.push(`token=${token}`);
  }

  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

export function configureAdaptiveBitrate(assetId: string): AdaptiveBitrateConfig {
  return {
    assetId,
    manifestUrl: `https://cdn.animaforge.com/adaptive/${assetId}/manifest.m3u8`,
    qualities: ["360p", "480p", "720p", "1080p", "4K"],
  };
}

export function getDeliveryMetrics(distributionId: string): DeliveryMetrics | null {
  return metrics.get(distributionId) ?? null;
}

export function purgeAsset(assetKey: string): { purged: boolean } {
  return { purged: true };
}

export function getEdgeLocations(): EdgeLocation[] {
  const regions = [
    { region: "us-east", cities: ["New York", "Washington DC", "Miami", "Atlanta", "Boston", "Philadelphia", "Charlotte", "Chicago", "Dallas", "Houston", "Denver", "Phoenix", "Minneapolis", "Detroit", "Tampa"] },
    { region: "us-west", cities: ["Los Angeles", "San Francisco", "Seattle", "Portland", "San Jose", "Las Vegas", "Salt Lake City", "Sacramento", "San Diego", "Boise", "Reno", "Tucson", "Albuquerque", "Honolulu", "Anchorage"] },
    { region: "eu-west", cities: ["London", "Paris", "Amsterdam", "Dublin", "Frankfurt", "Madrid", "Lisbon", "Brussels", "Milan", "Zurich", "Vienna", "Berlin", "Munich", "Hamburg", "Barcelona"] },
    { region: "eu-north", cities: ["Stockholm", "Helsinki", "Oslo", "Copenhagen", "Tallinn", "Riga", "Vilnius", "Reykjavik", "Gothenburg", "Bergen", "Tampere", "Turku", "Aarhus", "Malmö", "Uppsala"] },
    { region: "asia-east", cities: ["Tokyo", "Seoul", "Osaka", "Taipei", "Hong Kong", "Shanghai", "Beijing", "Shenzhen", "Guangzhou", "Chengdu", "Nanjing", "Hangzhou", "Busan", "Fukuoka", "Sapporo"] },
    { region: "asia-south", cities: ["Mumbai", "Singapore", "Bangkok", "Jakarta", "Kuala Lumpur", "Manila", "Chennai", "Bangalore", "Delhi", "Hyderabad", "Ho Chi Minh City", "Hanoi", "Colombo", "Dhaka", "Karachi"] },
    { region: "south-america", cities: ["São Paulo", "Buenos Aires", "Rio de Janeiro", "Santiago", "Bogotá", "Lima", "Medellín", "Quito", "Caracas", "Montevideo", "Curitiba", "Fortaleza", "Brasília", "Córdoba", "Valparaíso"] },
    { region: "middle-east", cities: ["Dubai", "Tel Aviv", "Riyadh", "Doha", "Muscat", "Kuwait City", "Bahrain", "Amman", "Beirut", "Abu Dhabi", "Jeddah", "Dammam", "Sharjah", "Ankara", "Istanbul"] },
    { region: "africa", cities: ["Johannesburg", "Cape Town", "Lagos", "Nairobi", "Cairo", "Casablanca", "Accra", "Dar es Salaam", "Addis Ababa", "Kigali", "Dakar", "Abuja", "Kampala", "Maputo", "Tunis"] },
    { region: "oceania", cities: ["Sydney", "Melbourne", "Auckland", "Brisbane", "Perth", "Adelaide", "Wellington", "Christchurch", "Canberra", "Gold Coast", "Hobart", "Darwin", "Cairns", "Hamilton", "Suva"] },
  ];

  const locations: EdgeLocation[] = [];
  for (const r of regions) {
    for (const city of r.cities) {
      locations.push({
        id: `pop-${r.region}-${city.toLowerCase().replace(/\s+/g, "-")}`,
        region: r.region,
        city,
      });
    }
  }

  return locations;
}

export function estimateDeliveryCost(
  bandwidth_gb: number,
  region: string,
): { estimatedUSD: number } {
  const ratePerGb: Record<string, number> = {
    "us-east": 0.085,
    "us-west": 0.085,
    "eu-west": 0.085,
    "eu-north": 0.090,
    "asia-east": 0.120,
    "asia-south": 0.110,
    "south-america": 0.110,
    "middle-east": 0.110,
    "africa": 0.130,
    "oceania": 0.098,
  };

  const rate = ratePerGb[region] ?? 0.10;
  const estimatedUSD = Math.round(bandwidth_gb * rate * 100) / 100;
  return { estimatedUSD };
}

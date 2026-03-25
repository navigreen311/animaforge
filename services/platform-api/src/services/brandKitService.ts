import { v4 as uuidv4 } from "uuid";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogoConfig {
  url: string;
  placement: "top-left" | "center" | "bottom-right";
  minSize: number;
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  sizes: { label: string; value: number }[];
}

export interface SonicConfig {
  introUrl: string;
  outroUrl: string;
  transitionUrl: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity: number;
}

export interface BrandTemplate {
  id: string;
  name: string;
  description: string;
  snapshot: Record<string, unknown>;
}

export interface BrandKit {
  id: string;
  projectId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  logo: LogoConfig;
  typography: TypographyConfig;
  sonic: SonicConfig;
  watermark: WatermarkConfig;
  templates: BrandTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandViolation {
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface BrandGuideSection {
  title: string;
  content: string;
}

// ── In-memory store ────────────────────────────────────────────────────────

const brandKits: Map<string, BrandKit> = new Map();

export function clearBrandKits(): void {
  brandKits.clear();
}

// ── Service functions ──────────────────────────────────────────────────────

export async function createBrandKit(
  projectId: string,
  data: Omit<BrandKit, "id" | "projectId" | "createdAt" | "updatedAt">,
): Promise<BrandKit> {
  const now = new Date().toISOString();
  const kit: BrandKit = {
    id: uuidv4(),
    projectId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  brandKits.set(projectId, kit);
  return kit;
}

export async function getBrandKit(projectId: string): Promise<BrandKit | undefined> {
  return brandKits.get(projectId);
}

export async function updateBrandKit(
  projectId: string,
  updates: Partial<Omit<BrandKit, "id" | "projectId" | "createdAt" | "updatedAt">>,
): Promise<BrandKit | undefined> {
  const existing = brandKits.get(projectId);
  if (!existing) return undefined;

  const updated: BrandKit = {
    ...existing,
    ...updates,
    colors: updates.colors ? { ...existing.colors, ...updates.colors } : existing.colors,
    logo: updates.logo ? { ...existing.logo, ...updates.logo } : existing.logo,
    typography: updates.typography
      ? { ...existing.typography, ...updates.typography }
      : existing.typography,
    sonic: updates.sonic ? { ...existing.sonic, ...updates.sonic } : existing.sonic,
    watermark: updates.watermark
      ? { ...existing.watermark, ...updates.watermark }
      : existing.watermark,
    updatedAt: new Date().toISOString(),
  };
  brandKits.set(projectId, updated);
  return updated;
}

export async function validateBrandConsistency(
  projectId: string,
  outputUrl: string,
): Promise<{ compliant: boolean; violations: BrandViolation[] }> {
  const kit = brandKits.get(projectId);
  if (!kit) {
    return {
      compliant: false,
      violations: [
        { rule: "brand-kit-exists", severity: "error", message: "No brand kit found for project" },
      ],
    };
  }

  const violations: BrandViolation[] = [];

  if (!kit.logo.url) {
    violations.push({
      rule: "logo-present",
      severity: "warning",
      message: "Brand kit has no logo configured — output cannot include logo overlay",
    });
  }

  if (!kit.watermark.enabled) {
    violations.push({
      rule: "watermark-enabled",
      severity: "warning",
      message: "Watermark is disabled — output will not include watermark protection",
    });
  }

  if (!outputUrl) {
    violations.push({
      rule: "output-url-valid",
      severity: "error",
      message: "Output URL is required for validation",
    });
  }

  return { compliant: violations.filter((v) => v.severity === "error").length === 0, violations };
}

export async function generateBrandGuide(
  projectId: string,
): Promise<{ guideUrl: string; sections: BrandGuideSection[] } | undefined> {
  const kit = brandKits.get(projectId);
  if (!kit) return undefined;

  const sections: BrandGuideSection[] = [
    {
      title: "Color Palette",
      content: `Primary: ${kit.colors.primary}, Secondary: ${kit.colors.secondary}, Accent: ${kit.colors.accent}, Background: ${kit.colors.background}, Text: ${kit.colors.text}`,
    },
    {
      title: "Typography",
      content: `Heading: ${kit.typography.headingFont}, Body: ${kit.typography.bodyFont}, Sizes: ${kit.typography.sizes.map((s) => `${s.label}=${s.value}px`).join(", ")}`,
    },
    {
      title: "Logo Usage",
      content: `Placement: ${kit.logo.placement}, Minimum size: ${kit.logo.minSize}px`,
    },
    {
      title: "Sonic Branding",
      content: `Intro: ${kit.sonic.introUrl || "none"}, Outro: ${kit.sonic.outroUrl || "none"}, Transition: ${kit.sonic.transitionUrl || "none"}`,
    },
    {
      title: "Watermark",
      content: `Enabled: ${kit.watermark.enabled}, Position: ${kit.watermark.position}, Opacity: ${kit.watermark.opacity}`,
    },
  ];

  return {
    guideUrl: `/api/v1/projects/${projectId}/brand-kit/guide/download`,
    sections,
  };
}

export async function applyBrandToOutput(
  outputUrl: string,
  brandKitId: string,
): Promise<{ applied: boolean; outputUrl: string; operations: string[] }> {
  let kit: BrandKit | undefined;
  for (const k of brandKits.values()) {
    if (k.id === brandKitId) {
      kit = k;
      break;
    }
  }

  if (!kit) {
    return { applied: false, outputUrl, operations: [] };
  }

  const operations: string[] = [];

  if (kit.logo.url) {
    operations.push(`overlay-logo:${kit.logo.placement}`);
  }
  if (kit.watermark.enabled) {
    operations.push(`apply-watermark:${kit.watermark.position}@${kit.watermark.opacity}`);
  }
  operations.push(`color-grade:primary=${kit.colors.primary}`);

  return {
    applied: true,
    outputUrl: `${outputUrl}?branded=${kit.id}`,
    operations,
  };
}

import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────

export interface WorldRule {
  id: string;
  type: "physics" | "social" | "magic" | "technology";
  description: string;
  scope: string;
  exceptions: string[];
}

export interface CharacterEntry {
  name: string;
  role: string;
  traits: string[];
  backstory: string;
  relationships: string[];
  constraints: string[];
}

export interface LocationEntry {
  name: string;
  description: string;
  climate?: string;
  features: string[];
  constraints: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  description: string;
  involvedCharacters: string[];
  location?: string;
}

export interface Relationship {
  character1: string;
  character2: string;
  type: string;
  description: string;
}

export interface Constraint {
  id: string;
  section: string;
  rule: string;
  description: string;
}

export interface WorldBibleSections {
  characters: Record<string, CharacterEntry>;
  world_rules: Record<string, WorldRule>;
  locations: Record<string, LocationEntry>;
  timeline: TimelineEvent[];
  relationships: Relationship[];
  constraints: Constraint[];
}

export interface WorldBible {
  bibleId: string;
  projectId: string;
  sections: WorldBibleSections;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  section: string;
  rule: string;
  violation: string;
}

export interface ConsistencyResult {
  valid: boolean;
  conflicts: Conflict[];
}

export interface EnforceResult {
  allowed: boolean;
  violations: string[];
  suggestions: string[];
}

export interface ExtractedContent {
  extracted: {
    characters: string[];
    locations: string[];
    rules: string[];
  };
}

// ─── In-memory store ────────────────────────────────────────

const bibles: Map<string, WorldBible> = new Map();

export function clearWorldBibles(): void {
  bibles.clear();
}

// ─── Helpers ────────────────────────────────────────────────

function getBible(projectId: string): WorldBible | undefined {
  for (const bible of bibles.values()) {
    if (bible.projectId === projectId) return bible;
  }
  return undefined;
}

// ─── Service Functions ──────────────────────────────────────

export async function createWorldBible(
  projectId: string,
  data: Partial<WorldBibleSections> = {},
): Promise<WorldBible> {
  const existing = getBible(projectId);
  if (existing) {
    const err = new Error("World Bible already exists for this project") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 409;
    err.code = "CONFLICT";
    throw err;
  }

  const now = new Date().toISOString();
  const bible: WorldBible = {
    bibleId: uuidv4(),
    projectId,
    sections: {
      characters: data.characters ?? {},
      world_rules: data.world_rules ?? {},
      locations: data.locations ?? {},
      timeline: data.timeline ?? [],
      relationships: data.relationships ?? [],
      constraints: data.constraints ?? [],
    },
    createdAt: now,
    updatedAt: now,
  };
  bibles.set(bible.bibleId, bible);
  return bible;
}

export async function updateSection(
  projectId: string,
  section: keyof WorldBibleSections,
  data: unknown,
): Promise<WorldBible> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const validSections: (keyof WorldBibleSections)[] = [
    "characters",
    "world_rules",
    "locations",
    "timeline",
    "relationships",
    "constraints",
  ];

  if (!validSections.includes(section)) {
    const err = new Error(`Invalid section: ${section}`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_SECTION";
    throw err;
  }

  (bible.sections as Record<string, unknown>)[section] = data;
  bible.updatedAt = new Date().toISOString();
  return bible;
}

export async function validateConsistency(
  projectId: string,
): Promise<ConsistencyResult> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const conflicts: Conflict[] = [];
  const { characters, world_rules, locations, relationships, timeline } = bible.sections;

  // Check that relationship characters exist
  for (const rel of relationships) {
    if (!characters[rel.character1]) {
      conflicts.push({
        section: "relationships",
        rule: "character_exists",
        violation: `Character "${rel.character1}" in relationship not found in characters`,
      });
    }
    if (!characters[rel.character2]) {
      conflicts.push({
        section: "relationships",
        rule: "character_exists",
        violation: `Character "${rel.character2}" in relationship not found in characters`,
      });
    }
  }

  // Check timeline references valid characters and locations
  for (const event of timeline) {
    for (const charName of event.involvedCharacters) {
      if (!characters[charName]) {
        conflicts.push({
          section: "timeline",
          rule: "character_exists",
          violation: `Timeline event "${event.description}" references unknown character "${charName}"`,
        });
      }
    }
    if (event.location && !locations[event.location]) {
      conflicts.push({
        section: "timeline",
        rule: "location_exists",
        violation: `Timeline event "${event.description}" references unknown location "${event.location}"`,
      });
    }
  }

  // Check world rule scopes reference valid locations
  for (const [, rule] of Object.entries(world_rules)) {
    if (
      rule.scope !== "global" &&
      rule.scope !== "all" &&
      !locations[rule.scope]
    ) {
      conflicts.push({
        section: "world_rules",
        rule: "scope_valid",
        violation: `Rule "${rule.description}" scoped to unknown location "${rule.scope}"`,
      });
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

export async function enforceConstraints(
  projectId: string,
  newContent: { type: string; data: Record<string, unknown> },
): Promise<EnforceResult> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const violations: string[] = [];
  const suggestions: string[] = [];
  const { world_rules, characters, locations, constraints } = bible.sections;

  const contentStr = JSON.stringify(newContent.data).toLowerCase();

  // Check against world rules
  for (const [, rule] of Object.entries(world_rules)) {
    const ruleKeywords = rule.description.toLowerCase().split(/\s+/);
    const violatesRule = ruleKeywords.some(
      (keyword) => keyword.length > 4 && contentStr.includes(keyword),
    );

    if (rule.type === "physics" && newContent.type === "scene") {
      if (violatesRule) {
        const isException = rule.exceptions.some((exc) =>
          contentStr.includes(exc.toLowerCase()),
        );
        if (!isException) {
          violations.push(`Potential violation of physics rule: ${rule.description}`);
          suggestions.push(
            `Review scene against rule: "${rule.description}". Exceptions: ${rule.exceptions.join(", ") || "none"}`,
          );
        }
      }
    }
  }

  // Check character constraints
  if (newContent.data.characters && Array.isArray(newContent.data.characters)) {
    for (const charName of newContent.data.characters as string[]) {
      const char = characters[charName];
      if (char) {
        for (const constraint of char.constraints) {
          violations.push(
            `Character "${charName}" has constraint: ${constraint}`,
          );
          suggestions.push(
            `Ensure "${charName}" adheres to constraint: ${constraint}`,
          );
        }
      }
    }
  }

  // Check location constraints
  if (newContent.data.location && typeof newContent.data.location === "string") {
    const loc = locations[newContent.data.location];
    if (loc) {
      for (const constraint of loc.constraints) {
        violations.push(
          `Location "${newContent.data.location}" has constraint: ${constraint}`,
        );
        suggestions.push(
          `Ensure scene at "${newContent.data.location}" respects: ${constraint}`,
        );
      }
    }
  }

  // Check explicit constraints
  for (const c of constraints) {
    if (c.section === newContent.type) {
      violations.push(`Constraint: ${c.description}`);
      suggestions.push(`Review against constraint rule "${c.rule}": ${c.description}`);
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
    suggestions,
  };
}

export async function generateFromDescription(
  projectId: string,
  description: string,
): Promise<ExtractedContent> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const sentences = description.split(/[.!?]+/).filter((s) => s.trim());

  const characters: string[] = [];
  const locations: string[] = [];
  const rules: string[] = [];

  const characterPatterns = [
    /(?:named|called|known as)\s+"?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)"?/g,
    /([A-Z][a-z]+)\s+(?:is a|was a|the)\s+\w+/g,
  ];

  const locationPatterns = [
    /(?:in|at|near|the city of|the land of|the kingdom of)\s+"?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)"?/g,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:is a (?:city|town|village|kingdom|realm|forest|mountain|land))/g,
  ];

  const rulePatterns = [
    /(?:rule|law|constraint|forbidden|must|cannot|always|never)[:\s]+(.+)/gi,
  ];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();

    for (const pattern of characterPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(trimmed)) !== null) {
        if (match[1] && !characters.includes(match[1])) {
          characters.push(match[1]);
        }
      }
    }

    for (const pattern of locationPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(trimmed)) !== null) {
        if (match[1] && !locations.includes(match[1])) {
          locations.push(match[1]);
        }
      }
    }

    for (const pattern of rulePatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(trimmed)) !== null) {
        if (match[1] && !rules.includes(match[1].trim())) {
          rules.push(match[1].trim());
        }
      }
    }
  }

  // Fallback: extract capitalized proper nouns if no patterns matched
  if (characters.length === 0 && locations.length === 0) {
    const properNouns = description.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)*/g) || [];
    const commonWords = new Set([
      "The", "This", "That", "There", "They", "Their", "These", "Those",
      "When", "Where", "What", "Which", "While", "With", "Would", "Will",
    ]);
    for (const noun of properNouns) {
      if (!commonWords.has(noun) && !characters.includes(noun)) {
        characters.push(noun);
      }
    }
  }

  return {
    extracted: {
      characters,
      locations,
      rules,
    },
  };
}

export async function getCharacterProfile(
  projectId: string,
  characterName: string,
): Promise<Record<string, unknown> | undefined> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const char = bible.sections.characters[characterName];
  if (!char) return undefined;

  const relatedRelationships = bible.sections.relationships.filter(
    (r) => r.character1 === characterName || r.character2 === characterName,
  );

  const timelineEvents = bible.sections.timeline.filter((e) =>
    e.involvedCharacters.includes(characterName),
  );

  const applicableRules = Object.values(bible.sections.world_rules).filter(
    (rule) => rule.scope === "global" || rule.scope === "all",
  );

  return {
    ...char,
    relationships_detail: relatedRelationships,
    timeline_events: timelineEvents,
    applicable_rules: applicableRules,
  };
}

export async function getLocationDetails(
  projectId: string,
  locationName: string,
): Promise<Record<string, unknown> | undefined> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const loc = bible.sections.locations[locationName];
  if (!loc) return undefined;

  const eventsAtLocation = bible.sections.timeline.filter(
    (e) => e.location === locationName,
  );

  const scopedRules = Object.values(bible.sections.world_rules).filter(
    (rule) => rule.scope === locationName || rule.scope === "global" || rule.scope === "all",
  );

  return {
    ...loc,
    timeline_events: eventsAtLocation,
    applicable_rules: scopedRules,
  };
}

export async function addRule(
  projectId: string,
  rule: Omit<WorldRule, "id">,
): Promise<WorldRule> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const validTypes = ["physics", "social", "magic", "technology"] as const;
  if (!validTypes.includes(rule.type as (typeof validTypes)[number])) {
    const err = new Error(`Invalid rule type: ${rule.type}`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }

  const newRule: WorldRule = {
    id: uuidv4(),
    ...rule,
    exceptions: rule.exceptions ?? [],
  };

  bible.sections.world_rules[newRule.id] = newRule;
  bible.updatedAt = new Date().toISOString();
  return newRule;
}

export async function checkSceneAgainstBible(
  projectId: string,
  sceneGraph: {
    characters?: string[];
    location?: string;
    actions?: string[];
    props?: string[];
  },
): Promise<{ valid: boolean; violations: string[] }> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const violations: string[] = [];

  // Check characters exist in bible
  if (sceneGraph.characters) {
    for (const charName of sceneGraph.characters) {
      if (!bible.sections.characters[charName]) {
        violations.push(`Unknown character "${charName}" not in World Bible`);
      }
    }
  }

  // Check location exists
  if (sceneGraph.location) {
    if (!bible.sections.locations[sceneGraph.location]) {
      violations.push(
        `Unknown location "${sceneGraph.location}" not in World Bible`,
      );
    } else {
      const loc = bible.sections.locations[sceneGraph.location];
      for (const constraint of loc.constraints) {
        violations.push(
          `Location constraint at "${sceneGraph.location}": ${constraint}`,
        );
      }
    }
  }

  // Check character constraints for characters in scene
  if (sceneGraph.characters) {
    for (const charName of sceneGraph.characters) {
      const char = bible.sections.characters[charName];
      if (char?.constraints.length) {
        for (const c of char.constraints) {
          violations.push(`Character "${charName}" constraint: ${c}`);
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export async function exportBible(
  projectId: string,
  format: "json" | "markdown" | "pdf",
): Promise<{ format: string; content: string }> {
  const bible = getBible(projectId);
  if (!bible) {
    const err = new Error("World Bible not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  if (format === "json") {
    return {
      format: "json",
      content: JSON.stringify(bible, null, 2),
    };
  }

  if (format === "markdown" || format === "pdf") {
    let md = `# World Bible: Project ${bible.projectId}\n\n`;

    md += "## Characters\n\n";
    for (const [name, char] of Object.entries(bible.sections.characters)) {
      md += `### ${name}\n`;
      md += `- **Role:** ${char.role}\n`;
      md += `- **Traits:** ${char.traits.join(", ")}\n`;
      md += `- **Backstory:** ${char.backstory}\n\n`;
    }

    md += "## Locations\n\n";
    for (const [name, loc] of Object.entries(bible.sections.locations)) {
      md += `### ${name}\n`;
      md += `- **Description:** ${loc.description}\n`;
      md += `- **Features:** ${loc.features.join(", ")}\n\n`;
    }

    md += "## World Rules\n\n";
    for (const [, rule] of Object.entries(bible.sections.world_rules)) {
      md += `- **[${rule.type}]** ${rule.description} (Scope: ${rule.scope})\n`;
    }
    md += "\n";

    md += "## Timeline\n\n";
    for (const event of bible.sections.timeline) {
      md += `- **${event.timestamp}:** ${event.description}\n`;
    }
    md += "\n";

    md += "## Relationships\n\n";
    for (const rel of bible.sections.relationships) {
      md += `- ${rel.character1} <-> ${rel.character2}: ${rel.type} -- ${rel.description}\n`;
    }

    return {
      format: format === "pdf" ? "pdf-ready-markdown" : "markdown",
      content: md,
    };
  }

  const err = new Error(`Unsupported format: ${format}`) as Error & {
    statusCode?: number;
    code?: string;
  };
  err.statusCode = 400;
  err.code = "INVALID_FORMAT";
  throw err;
}

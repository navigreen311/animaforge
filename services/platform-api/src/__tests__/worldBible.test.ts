import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import worldBibleRouter from "../routes/worldBible.js";
import { clearWorldBibles } from "../services/worldBibleService.js";
import { errorHandler } from "../middleware/errorHandler.js";

const app = express();
app.use(express.json());
app.use("/api/v1", worldBibleRouter);
app.use(errorHandler);

const PROJECT_ID = "proj-world-bible-001";

const fullBibleData = {
  characters: {
    Elara: {
      name: "Elara",
      role: "protagonist",
      traits: ["brave", "curious"],
      backstory: "A warrior from the Northern Peaks",
      relationships: ["Thane"],
      constraints: ["cannot use dark magic"],
    },
    Thane: {
      name: "Thane",
      role: "antagonist",
      traits: ["cunning", "powerful"],
      backstory: "Former king of the Shadow Realm",
      relationships: ["Elara"],
      constraints: ["bound to the Shadow Realm"],
    },
  },
  locations: {
    "Northern Peaks": {
      name: "Northern Peaks",
      description: "A frozen mountain range",
      climate: "arctic",
      features: ["ice caves", "dragon nests"],
      constraints: ["no fire magic allowed"],
    },
    "Shadow Realm": {
      name: "Shadow Realm",
      description: "A dark parallel dimension",
      features: ["living shadows", "echo chambers"],
      constraints: ["mortals lose energy over time"],
    },
  },
  world_rules: {},
  timeline: [
    {
      id: "evt-1",
      timestamp: "Year 100",
      description: "The Great Sundering splits the realms",
      involvedCharacters: ["Elara"],
      location: "Northern Peaks",
    },
  ],
  relationships: [
    {
      character1: "Elara",
      character2: "Thane",
      type: "enemy",
      description: "Sworn enemies since the Sundering",
    },
  ],
  constraints: [],
};

beforeEach(() => {
  clearWorldBibles();
});

// ─── TEST 1: Create World Bible ─────────────────────────────

describe("POST /api/v1/projects/:projectId/world-bible/create", () => {
  it("should create a world bible and return 201", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bibleId).toBeDefined();
    expect(res.body.data.sections.characters).toHaveProperty("Elara");
    expect(res.body.data.sections.characters).toHaveProperty("Thane");
    expect(res.body.data.sections.locations).toHaveProperty("Northern Peaks");
  });
});

// ─── TEST 2: Duplicate Bible Conflict ───────────────────────

describe("POST /api/v1/projects/:projectId/world-bible/create (duplicate)", () => {
  it("should return 409 if bible already exists", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    expect(res.status).toBe(409);
  });
});

// ─── TEST 3: Update Section ─────────────────────────────────

describe("PUT /api/v1/projects/:projectId/world-bible/section/:section", () => {
  it("should update a specific section", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .put(`/api/v1/projects/${PROJECT_ID}/world-bible/section/characters`)
      .send({
        data: {
          Elara: { ...fullBibleData.characters.Elara, role: "hero" },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.sections.characters.Elara.role).toBe("hero");
  });
});

// ─── TEST 4: Validate Consistency (clean) ───────────────────

describe("POST /api/v1/projects/:projectId/world-bible/validate", () => {
  it("should return valid for consistent bible", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/validate`);

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.conflicts).toHaveLength(0);
  });
});

// ─── TEST 5: Validate Consistency (with conflicts) ──────────

describe("POST /api/v1/projects/:projectId/world-bible/validate (conflicts)", () => {
  it("should detect relationship referencing unknown character", async () => {
    const badData = {
      ...fullBibleData,
      relationships: [
        {
          character1: "Elara",
          character2: "GhostChar",
          type: "ally",
          description: "Unknown relationship",
        },
      ],
    };

    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(badData);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/validate`);

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.conflicts.length).toBeGreaterThan(0);
    expect(res.body.data.conflicts[0].violation).toContain("GhostChar");
  });
});

// ─── TEST 6: Add Rule ───────────────────────────────────────

describe("POST /api/v1/projects/:projectId/world-bible/rules", () => {
  it("should add a world rule", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/rules`)
      .send({
        type: "magic",
        description: "All magic requires a spoken incantation",
        scope: "global",
        exceptions: ["innate abilities"],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.type).toBe("magic");
    expect(res.body.data.description).toBe("All magic requires a spoken incantation");
  });
});

// ─── TEST 7: Check Scene Against Bible ──────────────────────

describe("POST /api/v1/projects/:projectId/world-bible/check-scene", () => {
  it("should detect unknown characters in scene graph", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/check-scene`)
      .send({
        characters: ["Elara", "UnknownHero"],
        location: "Northern Peaks",
        actions: ["fight"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("UnknownHero"),
      ]),
    );
  });
});

// ─── TEST 8: Get Character Profile ──────────────────────────

describe("GET /api/v1/projects/:projectId/world-bible/character/:name", () => {
  it("should return aggregated character profile", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/world-bible/character/Elara`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Elara");
    expect(res.body.data.role).toBe("protagonist");
    expect(res.body.data.relationships_detail).toBeDefined();
    expect(res.body.data.timeline_events).toBeDefined();
    expect(res.body.data.timeline_events).toHaveLength(1);
  });

  it("should return 404 for unknown character", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/world-bible/character/Nobody`);

    expect(res.status).toBe(404);
  });
});

// ─── TEST 9: Generate From Description ──────────────────────

describe("POST /api/v1/projects/:projectId/world-bible/generate", () => {
  it("should extract characters and locations from description", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send({});

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/generate`)
      .send({
        description:
          "Kira is a warrior from Stormhold. She must never betray her oath. The kingdom of Valdris is threatened by darkness.",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.extracted).toBeDefined();
    expect(res.body.data.extracted.characters.length).toBeGreaterThan(0);
    expect(res.body.data.extracted.rules.length).toBeGreaterThan(0);
  });
});

// ─── TEST 10: Export Bible ──────────────────────────────────

describe("GET /api/v1/projects/:projectId/world-bible/export", () => {
  it("should export bible as JSON", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/world-bible/export?format=json`);

    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("json");
    expect(res.body.data.content).toBeDefined();
    const parsed = JSON.parse(res.body.data.content);
    expect(parsed.sections.characters).toHaveProperty("Elara");
  });

  it("should export bible as markdown", async () => {
    await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/world-bible/create`)
      .send(fullBibleData);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/world-bible/export?format=markdown`);

    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("markdown");
    expect(res.body.data.content).toContain("# World Bible");
    expect(res.body.data.content).toContain("## Characters");
    expect(res.body.data.content).toContain("Elara");
  });
});

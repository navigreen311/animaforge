import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { projectService } from "../services/projectService.js";
import projectsRouter from "../routes/projects.js";
import { errorHandler } from "../middleware/errorHandler.js";

const app = express();
app.use(express.json());
app.use("/api/v1", projectsRouter);
app.use(errorHandler);

function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "editor");
const AUTH = { Authorization: `Bearer ${TOKEN}` };

describe("Projects CRUD", () => {
  beforeEach(() => {
    projectService.resetStore();
  });

  it("POST /api/v1/projects — creates a project", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set(AUTH)
      .send({ title: "My Project" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("My Project");
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe("active");
  });

  it("POST /api/v1/projects — creates a project with description", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set(AUTH)
      .send({ title: "Described Project", description: "A test description" });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("A test description");
  });

  it("POST /api/v1/projects — rejects empty title", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set(AUTH)
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/projects — lists projects with pagination", async () => {
    projectService.create({ title: "Project A" });
    projectService.create({ title: "Project B" });
    projectService.create({ title: "Project C" });

    const res = await request(app)
      .get("/api/v1/projects?page=1&limit=2")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(2);
  });

  it("GET /api/v1/projects/:id — returns a single project", async () => {
    const project = projectService.create({ title: "Lookup" });

    const res = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Lookup");
  });

  it("GET /api/v1/projects/:id — returns 404 for missing project", async () => {
    const res = await request(app)
      .get("/api/v1/projects/nonexistent-id")
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("PUT /api/v1/projects/:id — updates a project", async () => {
    const project = projectService.create({ title: "Original" });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}`)
      .set(AUTH)
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated");
  });

  it("DELETE /api/v1/projects/:id — soft-deletes a project", async () => {
    const project = projectService.create({ title: "To Delete" });

    const res = await request(app)
      .delete(`/api/v1/projects/${project.id}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    // Confirm project is no longer retrievable
    const getRes = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set(AUTH);
    expect(getRes.status).toBe(404);
  });

  it("PUT /api/v1/projects/:id/world-bible — updates world bible", async () => {
    const project = projectService.create({ title: "WB Project" });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}/world-bible`)
      .set(AUTH)
      .send({ setting: "Fantasy realm", era: "Medieval" });

    expect(res.status).toBe(200);
    expect(res.body.data.worldBible.setting).toBe("Fantasy realm");
    expect(res.body.data.worldBible.era).toBe("Medieval");
  });

  it("PUT /api/v1/projects/:id/brand-kit — updates brand kit", async () => {
    const project = projectService.create({ title: "BK Project" });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}/brand-kit`)
      .set(AUTH)
      .send({ primaryColor: "#ff0000", fontFamily: "Inter" });

    expect(res.status).toBe(200);
    expect(res.body.data.brandKit.primaryColor).toBe("#ff0000");
  });

  it("PUT /api/v1/projects/:id/style-lock — updates style lock", async () => {
    const project = projectService.create({ title: "SL Project" });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}/style-lock`)
      .set(AUTH)
      .send({ locked: true, preset: "cinematic" });

    expect(res.status).toBe(200);
    expect(res.body.data.styleLock.locked).toBe(true);
    expect(res.body.data.styleLock.preset).toBe("cinematic");
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/v1/projects");

    expect(res.status).toBe(401);
  });

  it("excludes soft-deleted projects from list", async () => {
    const project = projectService.create({ title: "Will Delete" });
    projectService.create({ title: "Will Keep" });
    projectService.softDelete(project.id);

    const res = await request(app)
      .get("/api/v1/projects")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe("Will Keep");
  });
});

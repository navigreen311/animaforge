import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearAll } from "../services/searchService";

describe("Search Service", () => {
  beforeEach(() => {
    clearAll();
  });

  it("should return health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("search");
  });

  it("should index a document", async () => {
    const res = await request(app).post("/search/index").send({
      type: "shots",
      content: "A beautiful sunset scene with warm colors",
      metadata: { style: "cinematic" },
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe("shots");
  });

  it("should search indexed documents", async () => {
    await request(app).post("/search/index").send({
      type: "shots",
      content: "A beautiful sunset scene with warm colors",
    });
    await request(app).post("/search/index").send({
      type: "characters",
      content: "A warrior character with armor",
    });

    const res = await request(app).get("/search?q=sunset");
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].document.content).toContain("sunset");
    expect(res.body.results[0].score).toBeGreaterThan(0);
  });

  it("should filter search by type", async () => {
    await request(app).post("/search/index").send({
      type: "shots",
      content: "Dragon flying over mountains",
    });
    await request(app).post("/search/index").send({
      type: "characters",
      content: "Dragon warrior character",
    });

    const res = await request(app).get("/search?q=dragon&type=characters");
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].document.type).toBe("characters");
  });

  it("should delete an indexed document", async () => {
    const indexed = await request(app).post("/search/index").send({
      type: "assets",
      content: "A golden sword prop",
    });

    const del = await request(app).delete(`/search/index/${indexed.body.id}`);
    expect(del.status).toBe(204);

    const search = await request(app).get("/search?q=golden+sword");
    expect(search.body.results).toHaveLength(0);
  });

  it("should require query parameter", async () => {
    const res = await request(app).get("/search");
    expect(res.status).toBe(400);
  });
});

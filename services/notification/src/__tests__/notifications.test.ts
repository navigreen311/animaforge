import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearAll } from "../services/notificationService";

describe("Notification Service", () => {
  beforeEach(() => {
    clearAll();
  });

  it("should return health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("notification");
  });

  it("should send a notification", async () => {
    const res = await request(app).post("/notifications/send").send({
      userId: "user-1",
      type: "in_app",
      title: "Job Complete",
      body: "Your render has finished",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.read).toBe(false);
    expect(res.body.title).toBe("Job Complete");
  });

  it("should reject invalid notification type", async () => {
    const res = await request(app).post("/notifications/send").send({
      userId: "user-1",
      type: "sms",
      title: "Test",
      body: "Test body",
    });
    expect(res.status).toBe(400);
  });

  it("should get user notifications with pagination", async () => {
    // Send 3 notifications
    for (let i = 0; i < 3; i++) {
      await request(app).post("/notifications/send").send({
        userId: "user-1",
        type: "push",
        title: `Notification ${i}`,
        body: `Body ${i}`,
      });
    }

    const res = await request(app).get("/notifications/user-1?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.total).toBe(3);
  });

  it("should mark a notification as read", async () => {
    const send = await request(app).post("/notifications/send").send({
      userId: "user-1",
      type: "email",
      title: "Test",
      body: "Test body",
    });

    const res = await request(app).put(`/notifications/${send.body.id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    await request(app).post("/notifications/send").send({
      userId: "user-2",
      type: "in_app",
      title: "N1",
      body: "B1",
    });
    await request(app).post("/notifications/send").send({
      userId: "user-2",
      type: "in_app",
      title: "N2",
      body: "B2",
    });

    const res = await request(app).put("/notifications/user-2/read-all");
    expect(res.status).toBe(200);
    expect(res.body.marked).toBe(2);
  });

  it("should filter by read status", async () => {
    await request(app).post("/notifications/send").send({
      userId: "user-3",
      type: "push",
      title: "N1",
      body: "B1",
    });
    const n2 = await request(app).post("/notifications/send").send({
      userId: "user-3",
      type: "push",
      title: "N2",
      body: "B2",
    });
    await request(app).put(`/notifications/${n2.body.id}/read`);

    const unread = await request(app).get("/notifications/user-3?read=false");
    expect(unread.body.notifications).toHaveLength(1);
    expect(unread.body.notifications[0].title).toBe("N1");

    const readRes = await request(app).get("/notifications/user-3?read=true");
    expect(readRes.body.notifications).toHaveLength(1);
    expect(readRes.body.notifications[0].title).toBe("N2");
  });

  it("should delete a notification", async () => {
    const send = await request(app).post("/notifications/send").send({
      userId: "user-1",
      type: "webhook",
      title: "Delete me",
      body: "Bye",
    });

    const del = await request(app).delete(`/notifications/${send.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get("/notifications/user-1");
    expect(get.body.notifications).toHaveLength(0);
  });
});

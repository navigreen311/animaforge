import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../services/notificationService";

const router = Router();

const sendSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["email", "push", "in_app", "webhook"]),
  title: z.string().min(1),
  body: z.string().min(1),
  category: z
    .enum([
      "job_complete",
      "job_failed",
      "review_requested",
      "comment_added",
      "collab_invite",
      "credit_low",
    ])
    .optional(),
});

// POST /notifications/send
router.post("/send", (req: Request, res: Response) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const notification = sendNotification(parsed.data);
  return res.status(201).json(notification);
});

// GET /notifications/:userId
router.get("/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const readParam = req.query.read as string | undefined;

  let read: boolean | undefined;
  if (readParam === "true") read = true;
  else if (readParam === "false") read = false;

  const result = getUserNotifications(userId, { page, limit, read });
  return res.json(result);
});

// PUT /notifications/:id/read
router.put("/:id/read", (req: Request, res: Response) => {
  const notification = markAsRead(req.params.id);
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.json(notification);
});

// PUT /notifications/:userId/read-all
router.put("/:userId/read-all", (req: Request, res: Response) => {
  const count = markAllAsRead(req.params.userId);
  return res.json({ marked: count });
});

// DELETE /notifications/:id
router.delete("/:id", (req: Request, res: Response) => {
  const deleted = deleteNotification(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.status(204).send();
});

export default router;

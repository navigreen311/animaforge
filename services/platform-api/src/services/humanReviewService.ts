import { v4 as uuidv4 } from "uuid";

// ── Types ───────────────────────────────────────────────────────────
export type ReviewTaskType =
  | "content_moderation"
  | "quality_check"
  | "rights_verification"
  | "customer_support"
  | "bug_report";

export type TaskPriority = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "escalated";
export type TaskDecision = "approve" | "reject" | "escalate" | "defer";

export interface ReviewTask {
  id: string;
  jobId: string;
  type: ReviewTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  context: Record<string, unknown>;
  reviewerId?: string;
  decision?: TaskDecision;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  completedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  body: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  responses: TicketResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  reviewerId: string;
  response: string;
  createdAt: string;
}

export interface ReviewerStats {
  assigned: number;
  completed_today: number;
  avg_time_per_review: number;
}

// ── SLA Targets ─────────────────────────────────────────────────────
export const SLA_TARGETS: Record<TaskPriority, string> = {
  urgent: "15min",
  high: "1hr",
  normal: "4hr",
  low: "24hr",
};

// ── In-memory stores ────────────────────────────────────────────────
const tasks = new Map<string, ReviewTask>();
const tickets = new Map<string, SupportTicket>();
const reviewers = new Set<string>();
const completionLog: { reviewerId: string; duration: number; date: string }[] = [];

// ── Service ─────────────────────────────────────────────────────────
export const humanReviewService = {
  /**
   * Create a review task and add it to the queue.
   */
  createReviewTask(
    jobId: string,
    type: ReviewTaskType,
    priority: TaskPriority,
    context: Record<string, unknown> = {},
  ): { taskId: string; queuePosition: number; estimatedWait: string } {
    const now = new Date().toISOString();
    const task: ReviewTask = {
      id: uuidv4(),
      jobId,
      type,
      priority,
      status: "pending",
      context,
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(task.id, task);

    // Queue position = number of pending tasks
    const pendingCount = Array.from(tasks.values()).filter(
      (t) => t.status === "pending",
    ).length;

    return {
      taskId: task.id,
      queuePosition: pendingCount,
      estimatedWait: SLA_TARGETS[priority],
    };
  },

  /**
   * Assign a task to a human reviewer.
   */
  assignTask(
    taskId: string,
    reviewerId: string,
  ): ReviewTask | undefined {
    const task = tasks.get(taskId);
    if (!task) return undefined;
    if (task.status !== "pending" && task.status !== "escalated") return undefined;

    task.reviewerId = reviewerId;
    task.status = "assigned";
    task.assignedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    reviewers.add(reviewerId);
    tasks.set(taskId, task);
    return task;
  },

  /**
   * Submit a review decision.
   */
  submitDecision(
    taskId: string,
    reviewerId: string,
    decision: TaskDecision,
    notes?: string,
  ): ReviewTask | undefined {
    const task = tasks.get(taskId);
    if (!task) return undefined;
    if (task.reviewerId !== reviewerId) return undefined;
    if (task.status !== "assigned" && task.status !== "in_progress") return undefined;

    const now = new Date().toISOString();
    task.decision = decision;
    task.notes = notes;
    task.status = decision === "escalate" ? "escalated" : "completed";
    task.completedAt = now;
    task.updatedAt = now;
    tasks.set(taskId, task);

    // Log completion for metrics
    if (task.assignedAt) {
      const duration = new Date(now).getTime() - new Date(task.assignedAt).getTime();
      completionLog.push({
        reviewerId,
        duration,
        date: now.slice(0, 10),
      });
    }

    return task;
  },

  /**
   * Get queue of tasks with optional filters.
   */
  getQueue(
    type?: ReviewTaskType | string,
    priority?: TaskPriority | string,
    status?: TaskStatus | string,
  ): ReviewTask[] {
    let result = Array.from(tasks.values());
    if (type) result = result.filter((t) => t.type === type);
    if (priority) result = result.filter((t) => t.priority === priority);
    if (status) result = result.filter((t) => t.status === status);
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /**
   * Get reviewer workload stats.
   */
  getReviewerWorkload(reviewerId: string): ReviewerStats {
    const today = new Date().toISOString().slice(0, 10);
    const assigned = Array.from(tasks.values()).filter(
      (t) => t.reviewerId === reviewerId && (t.status === "assigned" || t.status === "in_progress"),
    ).length;

    const todayLogs = completionLog.filter(
      (l) => l.reviewerId === reviewerId && l.date === today,
    );
    const completed_today = todayLogs.length;
    const avg_time_per_review =
      todayLogs.length > 0
        ? Math.round(todayLogs.reduce((sum, l) => sum + l.duration, 0) / todayLogs.length)
        : 0;

    return { assigned, completed_today, avg_time_per_review };
  },

  /**
   * Escalate a task: bump priority and reassign to senior reviewer.
   */
  escalateTask(
    taskId: string,
    reason: string,
  ): ReviewTask | undefined {
    const task = tasks.get(taskId);
    if (!task) return undefined;

    // Bump priority
    const priorityOrder: TaskPriority[] = ["low", "normal", "high", "urgent"];
    const currentIdx = priorityOrder.indexOf(task.priority);
    if (currentIdx < priorityOrder.length - 1) {
      task.priority = priorityOrder[currentIdx + 1];
    }

    task.status = "escalated";
    task.notes = reason;
    task.reviewerId = undefined; // unassign for senior reassignment
    task.updatedAt = new Date().toISOString();
    tasks.set(taskId, task);
    return task;
  },

  /**
   * Get queue metrics.
   */
  getMetrics(): {
    pending: number;
    in_progress: number;
    completed_today: number;
    avg_resolution_time: number;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  } {
    const today = new Date().toISOString().slice(0, 10);
    const allTasks = Array.from(tasks.values());

    const pending = allTasks.filter((t) => t.status === "pending" || t.status === "escalated").length;
    const in_progress = allTasks.filter((t) => t.status === "assigned" || t.status === "in_progress").length;

    const todayLogs = completionLog.filter((l) => l.date === today);
    const completed_today = todayLogs.length;
    const avg_resolution_time =
      todayLogs.length > 0
        ? Math.round(todayLogs.reduce((sum, l) => sum + l.duration, 0) / todayLogs.length)
        : 0;

    const by_type: Record<string, number> = {};
    const by_priority: Record<string, number> = {};
    for (const t of allTasks) {
      by_type[t.type] = (by_type[t.type] || 0) + 1;
      by_priority[t.priority] = (by_priority[t.priority] || 0) + 1;
    }

    return { pending, in_progress, completed_today, avg_resolution_time, by_type, by_priority };
  },

  /**
   * Round-robin assign pending tasks to available reviewers.
   */
  autoAssign(): ReviewTask[] {
    const available = Array.from(reviewers);
    if (available.length === 0) return [];

    const pendingTasks = Array.from(tasks.values())
      .filter((t) => t.status === "pending" || t.status === "escalated")
      .sort((a, b) => {
        const priorityOrder: TaskPriority[] = ["urgent", "high", "normal", "low"];
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      });

    const assigned: ReviewTask[] = [];
    let idx = 0;
    for (const task of pendingTasks) {
      const reviewerId = available[idx % available.length];
      const result = this.assignTask(task.id, reviewerId);
      if (result) assigned.push(result);
      idx++;
    }
    return assigned;
  },

  // ── Support Tickets ─────────────────────────────────────────────
  /**
   * Create a customer support ticket.
   */
  createSupportTicket(
    userId: string,
    subject: string,
    body: string,
    category: string,
  ): SupportTicket {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: uuidv4(),
      userId,
      subject,
      body,
      category,
      status: "open",
      responses: [],
      createdAt: now,
      updatedAt: now,
    };
    tickets.set(ticket.id, ticket);
    return ticket;
  },

  /**
   * List tickets, optionally filtered by userId.
   */
  getTickets(userId?: string): SupportTicket[] {
    let result = Array.from(tickets.values());
    if (userId) result = result.filter((t) => t.userId === userId);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * Add a response to a support ticket.
   */
  respondToTicket(
    ticketId: string,
    reviewerId: string,
    response: string,
  ): SupportTicket | undefined {
    const ticket = tickets.get(ticketId);
    if (!ticket) return undefined;

    const ticketResponse: TicketResponse = {
      id: uuidv4(),
      ticketId,
      reviewerId,
      response,
      createdAt: new Date().toISOString(),
    };
    ticket.responses.push(ticketResponse);
    ticket.status = "in_progress";
    ticket.updatedAt = new Date().toISOString();
    tickets.set(ticketId, ticket);
    return ticket;
  },

  /**
   * Close a support ticket.
   */
  closeTicket(ticketId: string): SupportTicket | undefined {
    const ticket = tickets.get(ticketId);
    if (!ticket) return undefined;

    ticket.status = "closed";
    ticket.updatedAt = new Date().toISOString();
    tickets.set(ticketId, ticket);
    return ticket;
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    tasks.clear();
    tickets.clear();
    reviewers.clear();
    completionLog.length = 0;
  },
};

import { v4 as uuidv4 } from 'uuid';
import { isDatabaseReachable, requirePrisma } from '../db.js';

import type { Prisma } from '@prisma/client';
// ── Types ───────────────────────────────────────────────────────────
export type ReceiptAction =
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'export_completed'
  | 'review_submitted'
  | 'payment_processed'
  | 'consent_granted'
  | 'consent_revoked';

export interface Receipt {
  receiptId: string;
  userId: string;
  action: ReceiptAction;
  timestamp: string;
  details: Record<string, unknown>;
  status: 'confirmed' | 'pending' | 'failed';
  projectId?: string;
}

export interface ReceiptSummary {
  userId: string;
  period: string;
  totalGenerations: number;
  totalExports: number;
  creditsUsed: number;
  actionsBreakdown: Record<string, number>;
}

// ── In-memory store ─────────────────────────────────────────────────
const receipts = new Map<string, Receipt>();

const VALID_ACTIONS: ReceiptAction[] = [
  'generation_started',
  'generation_completed',
  'generation_failed',
  'export_completed',
  'review_submitted',
  'payment_processed',
  'consent_granted',
  'consent_revoked',
];

/**
 * Map a `receipts` row onto the API shape.
 *
 * Every read path needs this, and they were each doing their own thing before
 * -- or rather, not doing it at all: `createReceipt` wrote to Postgres while
 * every read below queried the in-memory Map, so a receipt written to the
 * database could never be read back. The `Map` made that invisible, because
 * without a database both halves used it.
 */
function toReceipt(row: {
  receiptId: string;
  userId: string;
  action: string;
  createdAt: Date;
  details: unknown;
  status: string;
  projectId: string | null;
}): Receipt {
  return {
    receiptId: row.receiptId,
    userId: row.userId,
    action: row.action as ReceiptAction,
    timestamp: row.createdAt.toISOString(),
    details: (row.details ?? {}) as Record<string, unknown>,
    status: row.status as Receipt["status"],
    projectId: row.projectId ?? undefined,
  };
}

export const receiptService = {
  /**
   * Create a new receipt for a user action.
   */
  async createReceipt(
    userId: string,
    action: ReceiptAction,
    details: Record<string, unknown> = {},
  ): Promise<Receipt> {
    if (!VALID_ACTIONS.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    if (await isDatabaseReachable()) {
      try {
        const row = await requirePrisma().receipt.create({
          data: {
            receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            userId,
            action,
            // `details` is a Json column; Prisma types its input as
            // JsonNull | InputJsonValue, which Record<string, unknown> is not.
            details: details as Prisma.InputJsonValue,
            status: 'confirmed',
          },
        });
        if (row) {
          return {
            receiptId: row.receiptId,
            userId: row.userId,
            // The column is a plain string; the interface narrows it.
            action: row.action as ReceiptAction,
            timestamp: row.createdAt.toISOString(),
            details: (row.details ?? {}) as Record<string, unknown>,
            status: row.status as Receipt['status'],
            projectId: row.projectId ?? undefined,
          };
        }
      } catch {
        // Prisma not available -- fall through to in-memory
      }
    }

    const receipt: Receipt = {
      receiptId: uuidv4(),
      userId,
      action,
      timestamp: new Date().toISOString(),
      details,
      status: 'confirmed',
      projectId: (details.projectId as string) ?? undefined,
    };
    receipts.set(receipt.receiptId, receipt);
    return receipt;
  },

  /**
   * List receipts for a user with pagination.
   */
  async getReceipts(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ receipts: Receipt[]; total: number; page: number; limit: number }> {
    if (await isDatabaseReachable()) {
      const where = { userId };
      const [rows, total] = await Promise.all([
        requirePrisma().receipt.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        requirePrisma().receipt.count({ where }),
      ]);
      return { receipts: rows.map(toReceipt), total, page, limit };
    }

    const userReceipts = Array.from(receipts.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = userReceipts.length;
    const start = (page - 1) * limit;
    const paged = userReceipts.slice(start, start + limit);

    return { receipts: paged, total, page, limit };
  },

  /**
   * Get a single receipt by ID.
   */
  async getReceipt(receiptId: string): Promise<Receipt | undefined> {
    if (await isDatabaseReachable()) {
      const row = await requirePrisma().receipt.findUnique({ where: { receiptId } });
      return row ? toReceipt(row) : undefined;
    }
    return receipts.get(receiptId);
  },

  /**
   * Get all receipts for a given project.
   */
  async getReceiptsByProject(projectId: string): Promise<Receipt[]> {
    if (await isDatabaseReachable()) {
      const rows = await requirePrisma().receipt.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toReceipt);
    }

    return Array.from(receipts.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  /**
   * Generate a summary of user activity for a given period.
   */
  async generateSummary(userId: string, period: string = 'all'): Promise<ReceiptSummary> {
    let userReceipts: Receipt[];
    if (await isDatabaseReachable()) {
      const rows = await requirePrisma().receipt.findMany({ where: { userId } });
      userReceipts = rows.map(toReceipt);
    } else {
      userReceipts = Array.from(receipts.values()).filter((r) => r.userId === userId);
    }

    // Filter by period if not "all"
    if (period !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (period) {
        case 'day':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      userReceipts = userReceipts.filter((r) => new Date(r.timestamp) >= cutoff);
    }

    const actionsBreakdown: Record<string, number> = {};
    let totalGenerations = 0;
    let totalExports = 0;
    let creditsUsed = 0;

    for (const r of userReceipts) {
      actionsBreakdown[r.action] = (actionsBreakdown[r.action] ?? 0) + 1;

      if (r.action === 'generation_completed') {
        totalGenerations++;
        creditsUsed += (r.details.credits as number) ?? 1;
      }
      if (r.action === 'export_completed') {
        totalExports++;
      }
    }

    return {
      userId,
      period,
      totalGenerations,
      totalExports,
      creditsUsed,
      actionsBreakdown,
    };
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    receipts.clear();
  },
};

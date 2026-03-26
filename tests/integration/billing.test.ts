/**
 * Integration tests — Billing API
 *
 * Tests the /billing endpoints through the billing Express app,
 * exercising subscription lifecycle, credit operations, and usage reporting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { billingRequest, createTestUser } from './helpers';
import { _resetStores } from '../../services/billing/src/services/billingService';

// Reset billing in-memory stores before each test so state does not leak
beforeEach(() => {
  _resetStores();
});

describe('Billing API', () => {
  // 1. Subscribe to tier -> subscription created
  it('should subscribe a user to a tier and create a subscription', async () => {
    const user = await createTestUser();

    const res = await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'starter',
    });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(user.id);
    expect(res.body.tier).toBe('starter');
    expect(res.body.status).toBe('active');
    expect(res.body.id).toBeDefined();
  });

  // 2. Get credit balance -> correct initial credits
  it('should return correct initial credit balance after subscribing', async () => {
    const user = await createTestUser();

    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'starter',
    });

    const res = await billingRequest('get', `/billing/credits/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user.id);
    expect(res.body.balance).toBe(0);
    expect(res.body.usageThisPeriod).toBe(0);
    expect(res.body.periodStart).toBeDefined();
  });

  // 3. Deduct credits -> balance decremented
  it('should deduct credits and decrement balance', async () => {
    const user = await createTestUser();

    // Subscribe to pro tier (300 credits) to have enough headroom
    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'pro',
    });

    // Top up so in-memory balance has credits
    await billingRequest('post', '/billing/credits/topup', {
      userId: user.id,
      amount: 100,
    });

    const balBefore = await billingRequest('get', `/billing/credits/${user.id}`);
    const balanceBefore = balBefore.body.balance;

    const res = await billingRequest('post', '/billing/credits/deduct', {
      userId: user.id,
      jobType: 'video_10s_preview',
      tier: 'pro',
    });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user.id);
    // video_10s_preview costs 1 credit
    expect(res.body.balance).toBe(balanceBefore - 1);
  });

  // 4. Insufficient credits -> 402 error
  it('should return 402 when credits are insufficient', async () => {
    const user = await createTestUser();

    // Subscribe to free tier (10 credits) but use them all up
    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'free',
    });

    // Exhaust all credits by deducting expensive jobs
    // avatar_reconstruction costs 10, which equals free tier allowance
    await billingRequest('post', '/billing/credits/deduct', {
      userId: user.id,
      jobType: 'avatar_reconstruction',
      tier: 'free',
    });

    // Now try to deduct more -> should fail with 402
    const res = await billingRequest('post', '/billing/credits/deduct', {
      userId: user.id,
      jobType: 'video_10s_preview',
      tier: 'free',
    });

    expect(res.status).toBe(402);
    expect(res.body.error).toContain('Insufficient credits');
  });

  // 5. Change tier -> subscription updated, credits adjusted
  it('should change subscription tier and update the record', async () => {
    const user = await createTestUser();

    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'starter',
    });

    const res = await billingRequest('put', `/billing/subscription/${user.id}`, {
      tier: 'pro',
    });

    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('pro');
    expect(res.body.userId).toBe(user.id);
    expect(res.body.status).toBe('active');
  });

  // 6. Cancel subscription -> status cancelled
  it('should cancel a subscription and set status to cancelled', async () => {
    const user = await createTestUser();

    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'starter',
    });

    const res = await billingRequest('delete', `/billing/subscription/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.userId).toBe(user.id);
  });

  // 7. Credit topup -> balance increased
  it('should top up credits and increase balance', async () => {
    const user = await createTestUser();

    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'free',
    });

    const balBefore = await billingRequest('get', `/billing/credits/${user.id}`);

    const res = await billingRequest('post', '/billing/credits/topup', {
      userId: user.id,
      amount: 50,
    });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user.id);
    expect(res.body.balance).toBe(balBefore.body.balance + 50);
  });

  // 8. Usage report -> correct aggregation
  it('should aggregate usage correctly after multiple deductions', async () => {
    const user = await createTestUser();

    await billingRequest('post', '/billing/subscribe', {
      userId: user.id,
      tier: 'pro',
    });

    // Deduct multiple jobs
    await billingRequest('post', '/billing/credits/deduct', {
      userId: user.id,
      jobType: 'video_10s_preview', // 1 credit
      tier: 'pro',
    });
    await billingRequest('post', '/billing/credits/deduct', {
      userId: user.id,
      jobType: 'style_clone', // 2 credits
      tier: 'pro',
    });

    const res = await billingRequest('get', `/billing/credits/${user.id}`);

    expect(res.status).toBe(200);
    // Total deducted: 1 + 2 = 3 credits
    expect(res.body.usageThisPeriod).toBe(3);
    expect(res.body.periodStart).toBeDefined();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  listItem,
  purchaseItem,
  submitReview,
  getReviews,
  getCreatorEarnings,
  requestPayout,
  COMMISSION_RATE,
  _resetStores,
} from '../../services/marketplace/src/services/marketplaceService';

const CREATOR_ID = '00000000-0000-4000-8000-000000000001';
const BUYER_ID = '00000000-0000-4000-8000-000000000002';
const REVIEWER_ID = '00000000-0000-4000-8000-000000000003';

beforeEach(() => {
  _resetStores();
});

async function createTestItem(price = 9.99) {
  return listItem({
    name: 'Cool Rig', type: 'rig', price, description: 'A reusable character rig',
    previewUrl: 'https://cdn.example.com/preview.png', creatorId: CREATOR_ID,
  });
}

// ---------------------------------------------------------------------------
// 1. List item
// ---------------------------------------------------------------------------
describe('Marketplace - List Item', () => {
  it('creates a marketplace listing with active status', async () => {
    const item = await createTestItem();
    expect(item.id).toBeDefined();
    expect(item.status).toBe('active');
    expect(item.purchaseCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Purchase with commission split
// ---------------------------------------------------------------------------
describe('Marketplace - Purchase & Commission', () => {
  it('processes a purchase and splits revenue correctly', async () => {
    const item = await createTestItem(100);
    const result = await purchaseItem(item.id, BUYER_ID);

    expect('transaction' in result).toBe(true);
    if ('transaction' in result) {
      expect(result.transaction.amount).toBe(100);
      expect(result.transaction.commission).toBe(+(100 * COMMISSION_RATE).toFixed(2));
      expect(result.transaction.sellerEarning).toBe(+(100 * (1 - COMMISSION_RATE)).toFixed(2));
      expect(result.item.purchaseCount).toBe(1);
    }
  });

  it('prevents buying your own item', async () => {
    const item = await createTestItem();
    const result = await purchaseItem(item.id, CREATOR_ID);
    expect('error' in result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Reviews
// ---------------------------------------------------------------------------
describe('Marketplace - Reviews', () => {
  it('submits a review and retrieves it', async () => {
    const item = await createTestItem();
    const review = submitReview(item.id, { rating: 5, comment: 'Excellent!', userId: REVIEWER_ID });

    expect('rating' in review).toBe(true);
    if ('rating' in review) {
      expect(review.rating).toBe(5);
    }

    const reviews = getReviews(item.id);
    expect(reviews).toHaveLength(1);
  });

  it('prevents duplicate reviews from the same user', async () => {
    const item = await createTestItem();
    submitReview(item.id, { rating: 4, comment: 'Good', userId: REVIEWER_ID });
    const dup = submitReview(item.id, { rating: 3, comment: 'Meh', userId: REVIEWER_ID });
    expect('error' in dup).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Seller earnings
// ---------------------------------------------------------------------------
describe('Marketplace - Seller Earnings', () => {
  it('credits the seller balance after purchase', async () => {
    const item = await createTestItem(50);
    await purchaseItem(item.id, BUYER_ID);

    const earnings = getCreatorEarnings(CREATOR_ID);
    const expectedEarning = +(50 * (1 - COMMISSION_RATE)).toFixed(2);
    expect(earnings.total).toBe(expectedEarning);
    expect(earnings.pending).toBe(expectedEarning);
    expect(earnings.transactions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Payout request
// ---------------------------------------------------------------------------
describe('Marketplace - Payout Request', () => {
  it('processes a payout and updates the balance', async () => {
    const item = await createTestItem(100);
    await purchaseItem(item.id, BUYER_ID);

    const earning = +(100 * (1 - COMMISSION_RATE)).toFixed(2);
    const payout = requestPayout(CREATOR_ID, earning);

    expect('status' in payout).toBe(true);
    if ('status' in payout) {
      expect(payout.status).toBe('pending');
      expect(payout.amount).toBe(earning);
    }

    const balance = getCreatorEarnings(CREATOR_ID);
    expect(balance.pending).toBe(0);
    expect(balance.paid).toBe(earning);
  });

  it('rejects payout exceeding pending balance', () => {
    const result = requestPayout(CREATOR_ID, 999);
    expect('error' in result).toBe(true);
  });
});

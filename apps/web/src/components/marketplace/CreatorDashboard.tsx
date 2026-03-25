'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  draft: 'bg-gray-500/20 text-gray-400',
  'under-review': 'bg-amber-500/20 text-amber-400',
  suspended: 'bg-red-500/20 text-red-400',
};

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  paid: 'text-emerald-400',
  pending: 'text-amber-400',
  processing: 'text-blue-400',
};

export default function CreatorDashboard() {
  const { myListings, payoutHistory, isLoading, fetchMyListings } = useMarketplaceStore();

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const totalEarnings = myListings.reduce((sum, l) => sum + l.revenue * 0.7, 0);
  const totalSales = myListings.reduce((sum, l) => sum + l.sales, 0);
  const activeListings = myListings.filter((l) => l.status === 'active').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage your listings, track sales, and view earnings.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Total Earnings (70%)</p>
            <p className="mt-1 text-3xl font-bold text-emerald-400">${totalEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Total Sales</p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{totalSales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Active Listings</p>
            <p className="mt-1 text-3xl font-bold text-primary">{activeListings}</p>
          </CardContent>
        </Card>
      </div>

      {/* My Listings table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">My Listings</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Category</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Price</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Sales</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Revenue (70%)</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                    Loading...
                  </td>
                </tr>
              ) : myListings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                    No listings yet. Publish your first item!
                  </td>
                </tr>
              ) : (
                myListings.map((listing) => (
                  <tr key={listing.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-4 font-medium text-[var(--color-text)]">{listing.name}</td>
                    <td className="px-6 py-4 text-[var(--color-text-muted)] capitalize">
                      {listing.category.replace('-', ' ')}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text)]">
                      {listing.price === 0 ? 'Free' : `$${listing.price.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text)]">{listing.sales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-400">
                      ${(listing.revenue * 0.7).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[listing.status] ?? ''}`}
                      >
                        {listing.status.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Payout History</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Amount</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {payoutHistory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payoutHistory.map((payout) => (
                  <tr key={payout.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-4 text-[var(--color-text)]">
                      {new Date(payout.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--color-text)]">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium capitalize ${PAYOUT_STATUS_STYLES[payout.status] ?? ''}`}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

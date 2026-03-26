'use client';

import type { ActivityItem } from '@/lib/types';
import { timeAgo } from '@/lib/utils/format';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

function SkeletonItem() {
  return (
    <div className="flex flex-row gap-2 py-2 items-start">
      <div
        className="animate-pulse flex-shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          marginTop: 5,
          background: 'var(--border)',
        }}
      />
      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div
          className="animate-pulse rounded"
          style={{
            height: 10,
            width: '80%',
            background: 'var(--border)',
          }}
        />
        <div
          className="animate-pulse rounded"
          style={{
            height: 8,
            width: '40%',
            background: 'var(--border)',
          }}
        />
      </div>
    </div>
  );
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center"
        style={{ marginBottom: 12 }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          Recent activity
        </span>
        <span
          className="hover:underline cursor-pointer"
          style={{
            fontSize: 10,
            color: 'var(--brand)',
          }}
        >
          View all
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col">
        {loading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : activities.length === 0 ? (
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            No recent activity. Start a project to see updates here.
          </p>
        ) : (
          activities.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-row gap-2 items-start"
              style={{
                padding: '8px 0',
                borderBottom:
                  index < activities.length - 1
                    ? '0.5px solid var(--border)'
                    : 'none',
              }}
            >
              {/* Dot */}
              <div
                className="flex-shrink-0 rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  marginTop: 5,
                  background: item.dotColor,
                }}
              />

              {/* Content */}
              <div className="flex flex-col flex-1 min-w-0">
                <p
                  className="line-clamp-2"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {item.projectTitle ? (
                    <>
                      {item.description.split(item.projectTitle).map((part, i, arr) =>
                        i < arr.length - 1 ? (
                          <span key={i}>
                            {part}
                            <span
                              style={{
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {item.projectTitle}
                            </span>
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </>
                  ) : (
                    item.description
                  )}
                </p>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    marginTop: 2,
                  }}
                >
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

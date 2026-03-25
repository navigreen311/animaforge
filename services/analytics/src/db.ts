import { createClient, ClickHouseClient } from "@clickhouse/client";

let client: ClickHouseClient | null = null;
let connected = false;

export function getClickHouseClient(): ClickHouseClient | null {
  if (!process.env.CLICKHOUSE_URL) {
    return null;
  }

  if (!client) {
    client = createClient({
      url: process.env.CLICKHOUSE_URL,
      database: process.env.CLICKHOUSE_DATABASE || "animaforge",
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "",
      request_timeout: 30000,
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });
  }

  return client;
}

export async function initClickHouse(): Promise<boolean> {
  const ch = getClickHouseClient();
  if (!ch) {
    console.warn("[analytics] CLICKHOUSE_URL not set — using in-memory fallback");
    return false;
  }

  try {
    await ch.command({
      query: `
        CREATE TABLE IF NOT EXISTS events (
          id String,
          type String,
          user_id String,
          project_id String DEFAULT '',
          metadata String DEFAULT '{}',
          timestamp DateTime64(3, 'UTC'),
          created_at DateTime64(3, 'UTC') DEFAULT now64(3)
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, type, user_id)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });

    connected = true;
    console.log("[analytics] ClickHouse connected and schema ready");
    return true;
  } catch (err) {
    console.warn("[analytics] ClickHouse unavailable — using in-memory fallback:", (err as Error).message);
    connected = false;
    return false;
  }
}

export function isClickHouseConnected(): boolean {
  return connected;
}

export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    connected = false;
  }
}

/**
 * Event bus wiring for the worker process.
 *
 * The workers are the origin of every generation and governance event, so this
 * is where the bus is created. Two rules shape this file:
 *
 *  1. Publishing must never break job processing. A generation that succeeded
 *     but failed to announce itself is a monitoring problem; a generation that
 *     *failed* because the broker was unreachable is a product outage. So
 *     `publishEvent` swallows and logs transport errors.
 *
 *  2. It must never look like it published when it did not. The swallow above
 *     always logs, and the backend in use is announced once at startup by
 *     createEventBus — including a loud refusal if a production process ends up
 *     on the in-process bus.
 */

import {
  createEventBus,
  type EventBus,
  type EventType,
  type PayloadInput,
} from '@animaforge/events';

const SOURCE = 'workers';

let bus: EventBus | null = null;
let connecting: Promise<EventBus> | null = null;

/**
 * Create and connect the bus. Idempotent, and safe to call concurrently — the
 * in-flight promise is shared so a burst of jobs at boot cannot open several
 * producers.
 */
export async function getEventBus(): Promise<EventBus> {
  if (bus) return bus;
  if (connecting) return connecting;

  connecting = (async () => {
    const selection = createEventBus({
      source: SOURCE,
      defaultGroupId: 'workers',
      // Dev clusters bring topics up via docker/kafka-init; this is a
      // belt-and-braces for a broker started without it.
      ensureTopics: true,
    });
    await selection.bus.connect();
    bus = selection.bus;
    return bus;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Publish an event, tolerating bus failure.
 *
 * Returns true if the event was published, false if it was dropped — callers
 * that care can check, but none are expected to change behaviour on it.
 */
export async function publishEvent<T extends EventType>(
  type: T,
  payload: PayloadInput<T>,
): Promise<boolean> {
  try {
    const activeBus = await getEventBus();
    await activeBus.publish(type, payload);
    return true;
  } catch (err) {
    // Logged every time, never silent: a dropped event is invisible in the
    // product, so the log is the only evidence it happened.
    console.warn(`[events] dropped "${type}":`, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Close the producer during graceful shutdown. */
export async function closeEventBus(): Promise<void> {
  if (!bus) return;
  try {
    await bus.disconnect();
  } finally {
    bus = null;
  }
}

# @animaforge/events

The Kafka event bus: topic definitions, validated event schemas, a KafkaJS
producer/consumer, and an in-process fallback for local dev.

## Why this exists

The README and CLAUDE.md have listed "Apache Kafka" as the message bus since the
beginning, but nothing in the repo published or consumed a single event. This
package is that bus.

## Backends

|                                 | `kafka` | `memory` |
| ------------------------------- | ------- | -------- |
| Events cross service boundaries | yes     | **no**   |
| Durable / replayable            | yes     | no       |
| Consumer groups, partitions     | yes     | no       |
| Late subscriber catches up      | yes     | no       |
| Needs a broker running          | yes     | no       |

The in-process bus exists so `docker compose up kafka` is not a prerequisite for
running the app locally. It runs the **same validation** as the Kafka bus, so a
payload that would be rejected in production is rejected in dev too.

### Selection

```
EVENT_BUS_BACKEND=kafka|memory   explicit
KAFKA_BROKERS=host:9092,...      implies kafka when BACKEND is unset
```

Unset both and you get the in-process bus. Whichever is chosen is **always
announced** at startup:

```
[events] workers using kafka event bus: brokers kafka:29092 as "workers" (reason: brokers-configured)
[events] workers using in-process event bus: events are delivered to handlers in
         this process only. Nothing is sent to or received from Kafka... (reason: no-brokers-configured)
```

`NODE_ENV=production` plus the memory backend **throws at startup**. A service
that silently falls back looks perfectly healthy from the inside — publishes
succeed, handlers fire, nothing errors — while every other service sees no
traffic at all. Override with `EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION=true`, which
still logs at error level on every boot.

## Usage

### Publishing

```ts
import { createEventBus } from '@animaforge/events';

const { bus } = createEventBus({ source: 'workers' });
await bus.connect();

await bus.publish('generation.started', {
  jobId: 'job-1',
  userId: 'user-1',
  projectId: 'proj-1',
  type: 'video',
});
```

The payload is validated before it leaves the process. An invalid one throws
`EventValidationError` rather than putting a malformed message on the topic.

### Consuming

```ts
const { bus } = createEventBus({ source: 'analytics' });
await bus.connect();

await bus.subscribe(
  ['generation.completed', 'generation.failed'],
  async (envelope) => {
    // envelope.payload is fully typed and already parsed
    console.log(envelope.type, envelope.payload.jobId);
  },
  {
    groupId: 'analytics-rollups',
    onInvalidMessage: (err) => reportToSentry(err),
  },
);
```

`groupId` is required on Kafka: members of one group split the partitions
between them, which is how a consumer scales horizontally. Two different groups
each receive their own copy of every event.

Always pass `onInvalidMessage` in production. Without it a malformed message is
logged and dropped; a message that _throws_ inside your handler would otherwise
be redelivered forever and block its partition for every other job.

## Topics

| Topic                      | Retention | Carries                                                                     |
| -------------------------- | --------- | --------------------------------------------------------------------------- |
| `animaforge.generation.v1` | 7 days    | `generation.started`, `.ai_submitted`, `.progress`, `.completed`, `.failed` |
| `animaforge.governance.v1` | 30 days   | `governance.stage_changed`, `governance.completed`                          |

Governance is retained ~4x longer because it is the audit trail of what was
moderated, consented, signed and watermarked.

Topics are versioned in the name. A breaking payload change means a **new
topic**, not a mutated one, so consumers on the old topic keep working while
they migrate. Additive optional fields do not need a new topic.

### Ordering

Messages are keyed by `correlationId`, which defaults to `payload.jobId`. Kafka
only guarantees ordering within a partition, and the key decides the partition —
so one job's events stay in order relative to each other. Without a key Kafka
round-robins and a `completed` event can overtake a `progress` event.

## Schemas

Schemas are zod, not bare TypeScript interfaces. The producer and consumer are
different processes on different deploy cycles; a type assertion across that
boundary is a wish, a parse is a check.

They mirror what the platform already emits — payload shapes are taken from the
`emitRealtimeEvent` calls in `services/workers/src/workers/generationWorker.ts`
and the stage/status vocabulary of `runGovernancePipeline`. If a field is here,
something in the codebase already produces it.

## What is wired today

`services/workers` publishes the full generation lifecycle and both governance
events. Publishing is **best-effort by design**: `publishEvent` catches and logs
transport failures rather than failing the job. A generation that succeeded but
failed to announce itself is a monitoring problem; a generation that failed
because a broker was unreachable is a product outage.

Every drop is logged. Nothing fails silently.

No service consumes these topics yet — the consumer side is implemented and
tested, but nothing subscribes in production. That is the honest state.

## Local development

```bash
docker compose -f docker/docker-compose.yml up kafka kafka-init
```

`kafka-init` creates both topics with the partition counts and retention above,
then exits. Broker auto-creation is deliberately **off**, so topic config is a
reviewed decision rather than whatever the first producer happens to get.

Reach the broker at `localhost:9092` from the host, `kafka:29092` from inside
compose. The broker advertises both.

```bash
npm test --workspace @animaforge/events
```

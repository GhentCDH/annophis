---
name: annophis-events
description: Publish or subscribe to Annophis bus events (NATS JetStream via EventBus). Use when a service must react to, or announce, a change in another service.
---

# Events

The `EventBus` (`@annophis/events`) is provided by `AnnophisServiceModule`. Inject it in any backend provider.

- **Publish:** `await bus.publish('<svc>.<entity>.<verb>', data, subjectId?)`.
  - Use past-tense verbs: `created`, `updated`, `deleted`.
  - The NATS subject becomes `annophis.<type>`. The envelope (`id`, `source`, `time`, `dataVersion`) is added for you.
  - Define the payload schema first (`annophis-contract` skill).
- **Subscribe** (e.g. in `onApplicationBootstrap`): `await bus.subscribe('<svc>.<entity>.*', handler)`.
  - It creates one durable consumer per service and filter.
  - **Handlers must be idempotent.** A throw means NAK and redelivery. Dedupe on `event.id` when the side effect is not idempotent.
  - Validate input with the contract schema: `X.parse(event)`.
- **Admin/CRUD writes:** never publish from controllers. The Prisma client extension in `libs/events` emits entity events, so admin writes produce them too.
- **Stream:** one JetStream stream `ANNOPHIS` on `annophis.>`. Inspect with `docker run --rm -it --network annophis-net natsio/nats-box nats sub -s nats://nats:4222 'annophis.>'`, or watch the `http://localhost:8222` monitoring page.
- **Tests:** use `createEventBusMock()` from `@annophis/testing`. It records `publish` calls without NATS.

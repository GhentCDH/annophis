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
- **Entity events:** every data source wraps its client with `withEntityEvents(new PrismaClient({ adapter }), '<svc>')` in `data-sources/default/index.ts`.
  - Every write publishes `<svc>.<model>.<created|updated|deleted>`, with data = the row and subject = its id. Bulk writes without returned rows publish `{ count, where }`.
  - The contract is `EntityChangedEvent` in `@annophis/contracts`.
  - Admin CRUD goes through the same client, so it emits too. **Never publish entity events from controllers.**
  - Fire-and-forget after the query returns: a NATS outage logs and drops the event and never fails the write. Inside an interactive transaction, an event can precede the commit. A transactional outbox is the upgrade path when that matters.
- **Stream:** one JetStream stream `ANNOPHIS` on `annophis.>`. Inspect with `docker run --rm -it --network annophis-net natsio/nats-box nats sub -s nats://nats:4222 'annophis.>'`, or watch the `http://localhost:6482` monitoring page.
- **Tests:** use `createEventBusMock()` from `@annophis/testing`. It records `publish` calls without NATS.

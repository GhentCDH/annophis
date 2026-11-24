# Annophis architecture docs

How the phase-0 skeleton fits together. Diagrams are [Mermaid](https://mermaid.js.org/), which GitHub renders inline.

| Doc | What it explains |
|---|---|
| [architecture.md](architecture.md) | The big picture: services, gateway, infra, repo layout |
| [admin-gateway.md](admin-gateway.md) | The single admin UI: login, merged sidebar, proxy to services |
| [events.md](events.md) | The event bus: entity events from Prisma, NATS JetStream, subscribers |
| [auth.md](auth.md) | Who may call what: admin sessions and service-to-service auth |
| [release-to-prod.md](release-to-prod.md) | From git tag to Nomad: images, environments, secrets, migrations, rollback (proposal) |

Working on the code? Start with [AGENTS.md](../AGENTS.md): rules, ports, commands and skills.

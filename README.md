# Annophis

> **Developing a multilingual, multimodal, and machine learning-driven annotation infrastructure for the analysis, creation, enrichment and cross-cultural comparison of historical formulaic text corpora (ANNOPHIS)**
>
> This project, funded by the Flemish Research Foundation, represents a collaboration between Ghent University and the University of Florida, aimed at developing an annotation platform for historical languages, specifically Ancient Greek and Latin. This platform will support manual annotation and validation of automatic annotations by integrating machine-learning models through APIs. Additionally, the platform will support multimodal annotation, including both texts and images.
>
> The primary corpora we will work with are formulaic texts, which are short texts with a fixed generic structure and a stereotypical visual format for highlighting key components. Ghent University has already developed two corpora of primarily Ancient Greek formulaic texts: the Database of Byzantine Book Epigrams (DBBE – [www.dbbe.ugent.be](http://www.dbbe.ugent.be)), a collection of medieval Greek paratexts, and the Database of Everyday Writing in Antiquity (EVWRIT – [www.evwrit.ugent.be](http://www.evwrit.ugent.be)), a database of everyday non-literary papyri and inscriptions.
>
> The University of Florida brings expertise in 3D digitization, digital preservation, dissemination, and advanced automatic analysis of inscriptions and historical artifacts through its Digital Epigraphy and Archaeology Project ([www.digitalepigraphy.org](http://www.digitalepigraphy.org)). The project also collaborates with the Data-Driven Humanities Research Group at the University of Florida ([https://classics.ufl.edu/data-driven-humanities-research-group/](https://classics.ufl.edu/data-driven-humanities-research-group/)), which specializes in applying Natural Language Processing and machine learning to analyze ancient Greek and Latin language, literature, and culture.

## Components

- [Annophis ML Hub](https://github.com/GhentCDH/annophis-mlhub) — a proxy for machine learning annotators: submit text as a LAPPS Interchange Format (LIF) document and get annotations (NER, POS, …) back from a pipeline of local or remote models.
- [Annophis Text Service](https://github.com/GhentCDH/annophis-text-service) — a small Go HTTP service that serves CTS/CEX and plain-text collections through a modern API, with URN-based lookup of passages, ranges and excerpts.
- [Annotation Editor](https://github.com/GhentCDH/annotation-editor) — a general, W3C Web Annotation-compliant editor: a Vue 3 component for creating and managing annotations on text sources, with a shared core library and a NestJS API module ([docs](https://ghentcdh.github.io/annotation-editor/)).

## Credits

Development by [Ghent Centre for Digital Humanities - Ghent University](https://www.ghentcdh.ugent.be/). Funded by the [GhentCDH research projects](https://www.ghentcdh.ugent.be/projects).

<img src="https://www.ghentcdh.ugent.be/ghentcdh_logo_blue_text_transparent_bg_landscape.svg" alt="Landscape" width="500">

## Development

Requirements: Node 24, pnpm ≥ 12, Docker.

```sh
pnpm install
docker compose up            # Postgres, NATS, Keycloak and every service (dev mode, hot reload)
```

Annophis only uses ports 6100–6499 (see the Ports section in [AGENTS.md](AGENTS.md)), so it runs next to other local stacks.

| What | URL |
|---|---|
| Admin UI (all services) | http://localhost:6200 — log in as `admin`/`admin` (Keycloak) |
| System status | http://localhost:6200/system-status (JSON: `/api/health/services`) |
| API docs (Swagger) | http://localhost:6200/api/docs (gateway), http://localhost:6200/api/<svc>/docs (each service) |
| Service backends | http://localhost:6100 (gateway), 6101–6104 (`ms-*`), 6110/6111 (text services), 6120 (ml-adapter) |
| Keycloak | http://localhost:6480 (console `admin`/`admin`; realm `annophis`, users `admin`/`admin`, `viewer`/`viewer`) |
| NATS monitoring | http://localhost:6482 |
| Postgres | `localhost:6432`, database `annophis`, one schema + user per service (password `dev`) |

To run infra in Docker and the apps on the host (much lighter than 15 dev containers):

```sh
docker compose up -d postgres nats keycloak
for d in apps/*/; do [ -f "$d.env" ] || cp "$d.env.example" "$d.env"; done   # first time
pnpm dev
```

Docker reads each `apps/<svc>/.env.example` (committed dev defaults), optionally overridden by `apps/<svc>/.env`.

Postgres reads its init files only on an empty volume. To reset: `docker compose down && rm -rf var`. Keycloak keeps no data: it re-imports `docker/keycloak/annophis-realm.json` on every start, so export console changes (below) or they are lost.

### Changing the Keycloak realm

Edit the realm in the console, then export it back to `docker/keycloak/annophis-realm.json`:

```sh
docker compose stop keycloak
docker compose run --rm --entrypoint /opt/keycloak/bin/kc.sh \
  -v "$PWD/docker/keycloak:/opt/keycloak/data/import" keycloak \
  export --dir /opt/keycloak/data/import --realm annophis --users realm_file
docker compose start keycloak
```

**The admin UIs are internal tools.** They write to the databases directly. Only users with the Keycloak `admin` role get in, and they must never be exposed publicly.

### CI

| Workflow | When | What |
|---|---|---|
| `ci.yml` | every PR, push to main | lint, typecheck, test, build (crouton shared CI) |
| `e2e.yml` | every PR, push to main | infra in Docker + all services via `pnpm dev`, then event-bus integration tests, provider contract tests and Playwright (`apps/e2e`); report uploaded on failure |
| `docker-build.yml` | tag `v*` | one image per service to `ghcr.io/<owner>/annophis-<svc>`, then a GitHub release from Conventional Commits |
| `labeler.yml`, `pr-title.yml` | PRs | labels from branch/files/title; title must be a Conventional Commit |

Architecture, with diagrams of the gateway, events and auth: [docs/](docs/README.md).

The development guide for coding agents is [AGENTS.md](AGENTS.md).

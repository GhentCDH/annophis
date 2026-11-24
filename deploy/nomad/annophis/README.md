# Nomad job for Annophis (draft)

Copy-ready job for [`nomad-jobs-ns-ghentcdh`](https://github.ugent.be/containers/nomad-jobs-ns-ghentcdh): copy this folder to `annophis/` there. It follows the conventions of `new_polities`, `mela` and `keycloak` in that repo. The strategy is in [docs/release-to-prod.md](../../../docs/release-to-prod.md).

- `job.nomad.hcl.j2`: one group, one task per app plus a NATS sidecar and one migrate prestart task per app. Only the gateway is published (Caddy :9000 → `nomad-lb` vhost); its health check is `/api/health/services`.
- `<env>.vars.yaml`: the version, domain and image per app. Deploy a release by bumping the image tags.
- Secrets live in Vault `kv_nomad/ghentcdh/annophis`, with the same keys as `.env.prod.example`: `<APP>_DATABASE_URL`, `<APP>_API_KEY`, `SERVICE_API_KEYS`, `CROUTON_AUTH_SECRET`, `INTERNAL_JWT_SECRET`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `GATEWAY_KEYCLOAK_CLIENT_SECRET`.

**Not verified against the cluster yet.** Before the first deploy, check:
- the `base/task.j2` and `base/network.j2` macro arguments;
- NATS JetStream storage (CSI or host volume);
- that Nexus proxies `ghcr.io/ghentcdh`.

The remaining TODOs are in [docs/release-to-prod.md](../../../docs/release-to-prod.md#todo-before-the-first-deploy-phase-1).

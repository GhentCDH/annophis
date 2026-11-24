/**
 * Services whose crouton admin is served through the gateway (one admin UI for all).
 * Each service sets `baseUrl: '/<name>'`, so its CRUD URIs come out as `/<name>/<route>`.
 * Ports: see AGENTS.md (backends 61xx).
 */
export const adminServices = [
  { name: 'ms-projects', title: 'Projects', port: 6101 },
  { name: 'ms-corpora', title: 'Corpora', port: 6102 },
  { name: 'ms-annotation', title: 'Annotations', port: 6103 },
  { name: 'ms-metadata', title: 'Metadata', port: 6104 },
  { name: 'text-service-1', title: 'Text service 1', port: 6110 },
  { name: 'text-service-2', title: 'Text service 2', port: 6111 },
  { name: 'ml-adapter', title: 'ML adapter', port: 6120 },
] as const;

/** Backend URL of a service: its compose hostname inside Docker, localhost otherwise. */
export const serviceUrl = ({ name, port }: { name: string; port: number }) =>
  `http://${process.env['IS_DOCKER'] ? `${name}-backend` : 'localhost'}:${port}`;

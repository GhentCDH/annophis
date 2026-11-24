/**
 * Services whose crouton admin UI is mounted under the gateway at `/<name>/`.
 * Used by vite.config.ts (dev proxy) and the admin hub page. Ports: see AGENTS.md.
 */
export const adminServices = [
  { name: 'ms-projects', title: 'Projects', port: 6201 },
  { name: 'ms-corpora', title: 'Corpora', port: 6202 },
  { name: 'ms-annotation', title: 'Annotations', port: 6203 },
  { name: 'ms-metadata', title: 'Metadata', port: 6204 },
  { name: 'text-service-1', title: 'Text service 1', port: 6210 },
  { name: 'text-service-2', title: 'Text service 2', port: 6211 },
] as const;

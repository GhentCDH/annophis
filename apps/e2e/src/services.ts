/** Backend base URLs of every service; override per service with E2E_<NAME>_URL (e.g. E2E_MS_PROJECTS_URL). */
const ports = {
  gateway: 6100,
  'ms-projects': 6101,
  'ms-corpora': 6102,
  'ms-annotation': 6103,
  'ms-metadata': 6104,
  'text-service-1': 6110,
  'text-service-2': 6111,
  'ml-adapter': 6120,
} as const;

export const services = Object.entries(ports).map(([name, port]) => ({
  name,
  url: process.env[`E2E_${name.toUpperCase().replace(/-/g, '_')}_URL`] ?? `http://localhost:${port}`,
}));

/** Backend base URLs of every service; override per service with E2E_<NAME>_URL (e.g. E2E_MS_PROJECTS_URL). */
const ports = {
  gateway: 3000,
  'ms-projects': 3001,
  'ms-corpora': 3002,
  'ms-annotation': 3003,
  'ms-metadata': 3004,
  'text-service-1': 3010,
  'text-service-2': 3011,
  'ml-adapter': 3020,
} as const;

export const services = Object.entries(ports).map(([name, port]) => ({
  name,
  url: process.env[`E2E_${name.toUpperCase().replace(/-/g, '_')}_URL`] ?? `http://localhost:${port}`,
}));

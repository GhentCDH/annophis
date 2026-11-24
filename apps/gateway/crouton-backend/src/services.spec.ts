import { afterEach, describe, expect, it, vi } from 'vitest';

import { serviceUrl } from './services';

describe('serviceUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses ANNOPHIS_<NAME>_URL when set', () => {
    vi.stubEnv('ANNOPHIS_MS_PROJECTS_URL', 'http://ms-projects-backend:6101');
    expect(serviceUrl({ name: 'ms-projects', port: 6101 })).toBe('http://ms-projects-backend:6101');
  });

  it('falls back to localhost:<port>', () => {
    expect(serviceUrl({ name: 'text-service-1', port: 6110 })).toBe('http://localhost:6110');
  });
});

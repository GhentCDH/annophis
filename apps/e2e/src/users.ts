import type { Page } from '@playwright/test';

/** Dev users from docker/keycloak/annophis-realm.json. */
export const users = {
  admin: { username: 'admin', password: 'admin' },
  viewer: { username: 'viewer', password: 'viewer' },
} as const;
export type Role = keyof typeof users;

export const authFile = (role: string) => `.auth/${role}.json`;

/** The crouton session token the gateway login stored (sent as Bearer by every admin UI). */
export const sessionToken = async (page: Page) => {
  await page.goto('/');
  return page.evaluate(() => localStorage.getItem('crouton.session'));
};

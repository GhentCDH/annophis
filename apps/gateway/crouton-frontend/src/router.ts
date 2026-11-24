import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

// The single admin UI: the gateway backend merges every service into one crouton sidebar (one group per
// service) and proxies /api/<svc>/* to that service. See apps/gateway/crouton-backend/src/admin-facade.ts.
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'admin', children: [...CroutonRouter] }],
});

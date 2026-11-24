import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

import SystemStatus from './pages/SystemStatus.vue';

// The single admin UI: the gateway backend merges every service into one crouton sidebar (one group per
// service) and proxies /api/<svc>/* to that service. See apps/gateway/crouton-backend/src/admin-facade.ts.
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // health of the gateway and every service (GET /api/health/services); crouton already uses /status
    { path: '/system-status', name: 'system-status', component: SystemStatus },
    { path: '/', name: 'admin', children: [...CroutonRouter] },
  ],
});

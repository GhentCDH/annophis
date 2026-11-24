import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

import AdminHub from './pages/AdminHub.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Hub: links to the gateway's own admin and every service admin (/<svc>/, proxied).
    { path: '/', name: 'hub', component: AdminHub },
    // The gateway's own database admin.
    { path: '/admin', name: 'admin', children: [...CroutonRouter] },
  ],
});

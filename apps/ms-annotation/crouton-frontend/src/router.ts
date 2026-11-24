import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'admin',
      children: [...CroutonRouter],
    },
  ],
});
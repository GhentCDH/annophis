<template>
  <main class="mx-auto max-w-4xl p-8">
    <header class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Annophis admin</h1>
      <div v-if="isAuthenticated" class="flex items-center gap-3 text-sm">
        <span>{{ user?.name ?? user?.email }}</span>
        <button class="btn btn-sm" type="button" @click="logout()">Log out</button>
      </div>
    </header>

    <p v-if="!isAdmin" class="alert alert-warning" role="alert">
      Your account has no <code>admin</code> role. Ask an administrator for access.
    </p>

    <nav v-else aria-label="Service admins">
      <ul class="grid gap-4 sm:grid-cols-2">
        <li>
          <RouterLink class="card card-border block p-4 hover:bg-base-200" to="/admin">
            <span class="font-medium">Gateway</span>
            <span class="block text-sm opacity-70">gateway</span>
          </RouterLink>
        </li>
        <li v-for="service in adminServices" :key="service.name">
          <!-- other vite apps on the same origin: full page load, not a router link -->
          <a class="card card-border block p-4 hover:bg-base-200" :href="`/${service.name}/`">
            <span class="font-medium">{{ service.title }}</span>
            <span class="block text-sm opacity-70">{{ service.name }}</span>
          </a>
        </li>
      </ul>
      <p class="mt-6 text-sm opacity-70">
        ml-adapter has no admin UI; its data is reachable through its API only.
      </p>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@ghentcdh/crouton-vue';

import { adminServices } from '../services';

const { user, isAuthenticated, hasRole, logout } = useAuth();
const isAdmin = computed(() => hasRole('admin'));
</script>

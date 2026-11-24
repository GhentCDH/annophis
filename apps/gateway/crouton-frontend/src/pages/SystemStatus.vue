<template>
  <main class="mx-auto max-w-5xl p-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">System status</h1>
      <span
        v-if="health"
        class="badge badge-lg"
        :class="health.status === 'ok' ? 'badge-success' : 'badge-error'"
        data-testid="overall-status"
      >
        {{ health.status === 'ok' ? 'All systems operational' : 'Degraded' }}
      </span>
    </header>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

    <table v-if="health" class="table" aria-label="Service health">
      <thead>
        <tr>
          <th>Service</th>
          <th>Status</th>
          <th>Event bus</th>
          <th>Crouton</th>
          <th>Links</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in health.services" :key="s.service">
          <td class="font-medium">{{ s.service }}</td>
          <td>
            <span class="badge" :class="s.status === 'ok' ? 'badge-success' : 'badge-error'">{{ s.status }}</span>
          </td>
          <td>
            <span class="badge badge-outline" :class="s.bus ? 'badge-success' : 'badge-warning'">
              {{ s.bus ? 'connected' : 'disconnected' }}
            </span>
          </td>
          <td>
            <a
              v-if="s.crouton"
              class="badge"
              :class="s.crouton.ok ? 'badge-success' : 'badge-error'"
              :href="`${base(s.service)}/crouton/status.json`"
              :title="`${s.crouton.databaseErrors} database, ${s.crouton.resourceErrors} resource errors, ${s.crouton.warningCount} warnings`"
            >
              {{ s.crouton.ok ? 'ok' : `${s.crouton.databaseErrors + s.crouton.resourceErrors} errors` }}
            </a>
          </td>
          <td class="space-x-2 text-sm">
            <a class="link" :href="`${base(s.service)}/docs`">API docs</a>
            <a class="link" :href="`${base(s.service)}/crouton/status.json`">status</a>
          </td>
          <td class="text-sm opacity-70">{{ s.error ?? '' }}</td>
        </tr>
      </tbody>
    </table>

    <p class="mt-4 text-sm opacity-70">
      Refreshes every {{ REFRESH_SECONDS }} s<span v-if="checkedAt">, last checked {{ checkedAt }}</span>. Raw JSON:
      <a class="link" href="/api/health/services">/api/health/services</a>
    </p>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { useApi } from '../api';

type CroutonStatus = { ok: boolean; databaseErrors: number; resourceErrors: number; warningCount: number };
type ServiceHealth = { service: string; status: 'ok' | 'down'; bus?: boolean; crouton?: CroutonStatus; error?: string };
type Health = { status: 'ok' | 'degraded'; services: ServiceHealth[] };

const REFRESH_SECONDS = 10;

/** Where a service is reachable through the gateway: the gateway itself at /api, services at /api/<svc>. */
const base = (service: string) => (service === 'gateway' ? '/api' : `/api/${service}`);

const health = ref<Health | null>(null);
const error = ref<string | null>(null);
const checkedAt = ref<string | null>(null);

const load = async () => {
  try {
    // 503 still carries the per-service report, so accept it
    const res = await useApi().get<Health>('/health/services', { validateStatus: (s) => s === 200 || s === 503 });
    health.value = res.data;
    error.value = null;
    checkedAt.value = new Date().toLocaleTimeString();
  } catch (e) {
    error.value = `Gateway unreachable: ${e instanceof Error ? e.message : String(e)}`;
  }
};

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void load();
  timer = setInterval(() => void load(), REFRESH_SECONDS * 1000);
});
onUnmounted(() => clearInterval(timer));
</script>

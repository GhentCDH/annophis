<template>
  <details class="collapse collapse-arrow border border-base-300 bg-base-100" :open="hasProblems">
    <summary class="collapse-title flex items-center gap-3">
      <span class="font-medium">{{ service }}</span>
      <span class="badge" :class="status.summary.ok ? 'badge-success' : 'badge-error'">
        {{ status.summary.ok ? 'ok' : 'errors' }}
      </span>
      <span class="text-sm opacity-70">
        {{ status.resources.length }} resources · {{ status.databases.length }} databases ·
        {{ status.summary.warningCount }} warnings
      </span>
    </summary>

    <div class="collapse-content space-y-4 text-sm">
      <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt class="opacity-70">App version</dt>
        <dd>{{ status.version }}</dd>
        <dt class="opacity-70">Crouton</dt>
        <dd>{{ status.croutonVersion }}</dd>
        <dt class="opacity-70">Environment</dt>
        <dd>{{ status.environment }}</dd>
      </dl>

      <section>
        <h3 class="mb-1 font-semibold">Databases</h3>
        <ul class="space-y-1">
          <li v-for="db in status.databases" :key="db.name" class="flex items-center gap-2">
            <span class="badge badge-sm" :class="db.connected ? 'badge-success' : 'badge-error'">
              {{ db.connected ? 'connected' : 'unreachable' }}
            </span>
            <span>{{ db.name }}</span>
            <span v-if="db.error" class="text-error">{{ db.error }}</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 class="mb-1 font-semibold">Resources</h3>
        <p v-if="!status.resources.length" class="opacity-70">No resources yet.</p>
        <table v-else class="table table-sm" :aria-label="`${service} resources`">
          <thead>
            <tr>
              <th>Resource</th>
              <th>State</th>
              <th>Kind</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in resources" :key="r.name">
              <td class="font-mono">{{ r.name }}</td>
              <td>
                <span class="badge badge-sm" :class="stateOf(r).badge">{{ stateOf(r).label }}</span>
              </td>
              <td>{{ r.kind ?? '' }}</td>
              <td>
                <p v-if="r.error" class="text-error">{{ r.error }}</p>
                <p v-for="w in r.warnings ?? []" :key="w" class="text-warning">{{ w }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { CroutonResource } from '../types/health';
import { CroutonStatusDetailsProperties } from './CroutonStatusDetails.properties';

const props = defineProps(CroutonStatusDetailsProperties);

const stateOf = (r: CroutonResource) => {
  if (r.draft) return { label: 'draft', badge: 'badge-ghost' };
  if (r.expectedVersion != null && r.expectedVersion !== r.version) return { label: 'needs migration', badge: 'badge-warning' };
  if (!r.valid) return { label: 'invalid', badge: 'badge-error' };
  if (r.warnings?.length) return { label: 'warnings', badge: 'badge-warning' };
  return { label: 'valid', badge: 'badge-success' };
};

// problems first, like crouton's own status page
const rank = (r: CroutonResource) => (!r.valid ? 0 : r.warnings?.length ? 1 : 2);
const resources = computed(() => [...props.status.resources].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));

const hasProblems = computed(() => !props.status.summary.ok || props.status.summary.warningCount > 0);
</script>

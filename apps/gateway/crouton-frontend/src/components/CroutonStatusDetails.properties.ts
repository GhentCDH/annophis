import type { PropType } from 'vue';

import type { CroutonStatus } from '../types/health';

export const CroutonStatusDetailsProperties = {
  service: { type: String, required: true as const },
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};

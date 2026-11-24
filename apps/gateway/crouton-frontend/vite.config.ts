import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

import { adminServices } from './src/services';

// Ports live in the workspace .env (FRONTEND_PORT / BACKEND_PORT).
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      port: Number(env.FRONTEND_PORT) || 4200,
      // Bind all interfaces inside docker so the mapped port is reachable.
      host: env.IS_DOCKER ? '0.0.0.0' : undefined,
      proxy: {
        '/api': {
          target: `http://${env.BACKEND_HOST || 'localhost'}:${env.BACKEND_PORT || 3000}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // Each service's admin UI (its own vite dev server, which proxies /<svc>/api to its backend).
        ...Object.fromEntries(
          adminServices.map(({ name, port }) => [
            `^/${name}(/|$)`,
            { target: `http://${env.IS_DOCKER ? `${name}-frontend` : 'localhost'}:${port}`, ws: true },
          ]),
        ),
      },
    },
  };
});

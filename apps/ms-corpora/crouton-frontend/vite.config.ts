import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// Ports live in the workspace .env (FRONTEND_PORT / BACKEND_PORT).
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');

  return {
    // Served under the gateway at /<svc>/ (gateway vite proxy / Caddy), and standalone at the same path.
    base: '/ms-corpora/',
    plugins: [vue(), tailwindcss()],
    server: {
      port: Number(env.FRONTEND_PORT) || 4200,
      // Bind all interfaces inside docker so the mapped port is reachable.
      host: env.IS_DOCKER ? '0.0.0.0' : undefined,
      // reached through the gateway proxy as <svc>-frontend inside docker
      allowedHosts: true,
      proxy: {
        '/ms-corpora/api': {
          target: `http://${env.BACKEND_HOST || 'localhost'}:${env.BACKEND_PORT || 3000}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ms-corpora\/api/, ''),
        },
      },
    },
  };
});

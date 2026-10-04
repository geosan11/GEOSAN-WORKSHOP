import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleTelemetryGateway } from './server/telemetry-gateway.ts';

const telemetryPlugin = (): Plugin => ({
  name: 'telemetry-gateway',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      handleTelemetryGateway(req, res, next);
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), telemetryPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

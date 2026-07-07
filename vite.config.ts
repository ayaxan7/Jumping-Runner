import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

// pose-detection statically imports two optional backends we never use
// (MediaPipe Pose + WebGPU). Point them at an empty stub so Vite/esbuild
// doesn't try to resolve the uninstalled packages.
const emptyShim = fileURLToPath(new URL('./src/vision/empty-shim.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mediapipe/pose': emptyShim,
      '@tensorflow/tfjs-backend-webgpu': emptyShim
    }
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          tfjs: [
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-converter',
            '@tensorflow/tfjs-backend-webgl',
            '@tensorflow-models/pose-detection'
          ]
        }
      }
    }
  }
});

import { defineConfig, type Plugin } from 'vite';

const buildSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'development';

function buildIdentity(): Plugin {
  return {
    name: 'realcity-build-identity',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildSha }, null, 2) + '\n'
      });
    }
  };
}

export default defineConfig({
  plugins: [buildIdentity()],
  define: {
    __REALCITY_BUILD_SHA__: JSON.stringify(buildSha)
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
        }
      }
    }
  }
});

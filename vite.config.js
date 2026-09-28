export default {
  // Native ESM avoids a Windows sandbox dependency-scanner traversal outside the project.
  optimizeDeps: { noDiscovery: true, include: [] },
  build: { target: 'es2022', minify: false, chunkSizeWarningLimit: 1000 },
};

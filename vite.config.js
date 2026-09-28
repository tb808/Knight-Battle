export default {
  // Relative asset paths work both locally and from the GitHub Pages project URL.
  base: './',
  // Native ESM avoids a Windows sandbox dependency-scanner traversal outside the project.
  optimizeDeps: { noDiscovery: true, include: [] },
  build: { target: 'es2022', minify: false, chunkSizeWarningLimit: 1000 },
};

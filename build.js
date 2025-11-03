const esbuild = require('esbuild');
const path = require('path');

// Helper to build a single app
function buildApp(entry, outFile) {
  return esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    outfile: outFile,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  });
}

// Build todos (existing)
buildApp('projects/todos/frontend/App.tsx', 'public/todos/bundle.js')
  // Also build bills frontend so it's available under public/bills/
  .then(() => buildApp('projects/bills/frontend/App.tsx', 'public/bills/bundle.js'))
  .catch(() => process.exit(1));

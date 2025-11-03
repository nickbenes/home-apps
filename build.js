const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['projects/todos/frontend/App.tsx'],
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  outfile: 'public/todos/bundle.js',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}).catch(() => process.exit(1));

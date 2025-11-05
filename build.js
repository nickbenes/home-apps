const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Find frontend entry points under projects/*/frontend
function findFrontendEntries(root = path.join(__dirname, 'projects')) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .map(name => {
      const frontendDir = path.join(root, name, 'frontend');
      const candidates = [
        path.join(frontendDir, 'index.tsx'),
        path.join(frontendDir, 'App.tsx'),
        path.join(frontendDir, 'index.jsx'),
        path.join(frontendDir, 'App.jsx'),
      ];
      const entry = candidates.find(p => fs.existsSync(p));
      return entry ? { name, entry } : null;
    })
    .filter(Boolean);
}

async function buildAll({ watch = false } = {}) {
  const entries = findFrontendEntries();
  if (!entries.length) {
    console.info('No frontend entries found under projects/*/frontend — nothing to build.');
    return;
  }

  // In watch mode we keep esbuild instances running; otherwise do one-off builds.
  for (const e of entries) {
    const outDir = path.join('public', e.name);
    const outFile = path.join(outDir, 'bundle.js');
    fs.mkdirSync(outDir, { recursive: true });
  console.info(`Building ${e.name} -> ${outFile}`);

    const commonOpts = {
      entryPoints: [e.entry],
      bundle: true,
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      outfile: outFile,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.js': 'js',
        '.jsx': 'jsx',
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    };

    try {
      // Do initial build
      await esbuild.build(commonOpts);

      if (watch) {
        console.info(`Watching ${e.name} for changes...`);
        // Simple file watcher that triggers a rebuild on changes.
        // We avoid using esbuild's watch option for compatibility with older esbuild versions.
        const watchedDir = path.dirname(e.entry);
        let timer = null;
        try {
          fs.watch(watchedDir, { recursive: false }, (evt, filename) => {
            // debounced rebuild
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
              console.info(`Detected change in ${e.name}: ${filename || '<unknown>'}, rebuilding...`);
              try {
                await esbuild.build(commonOpts);
                console.info(`Rebuilt ${e.name} -> ${outFile}`);
              } catch (reErr) {
                console.error(`Rebuild failed for ${e.name}:`, reErr);
              }
            }, 100);
          });
        } catch (watchErr) {
          console.warn(`File watching not available for ${e.name}:`, watchErr);
        }
      }
    } catch (err) {
      console.error(`Build failed for ${e.name}:`, err);
      process.exit(1);
    }
  }
}

// CLI args: --watch or --dev enables watch mode
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('--dev');

buildAll({ watch }).catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

# bills-tracker
Agentic vibe-coding experiment: recurring bills priority scheduler built with Claude Code.

## Building frontends

This repository uses a small esbuild-based script, `build.js`, to compile frontend apps located under `projects/*/frontend`.

- The build script now scans every `projects/<name>/frontend` directory and looks for common entry files (`App.tsx`, `index.tsx`, `App.jsx`, `index.jsx`).
- Each discovered frontend is bundled into `public/<name>/bundle.js` and the output directory is created automatically.
- The build is intentionally minimal: it bundles with sensible defaults (minify in production, sourcemaps in development) and exits non-zero on failure.

To add a new frontend app, create the folder `projects/<your-app>/frontend` and include one of the recognized entry files (for example `App.tsx`). Then run:
```bash
npm run build
```

To build and then run a local dev server (`server.js`), run:
```bash
npm run dev
```

To watch for file changes and run incremental builds:
```bash
npm run watch
```

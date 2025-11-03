# claude
sandbox for learning about claude code

## Building frontends

This repository uses a small esbuild-based script, `build.js`, to compile frontend apps located under `projects/*/frontend`.

- The build script now scans every `projects/<name>/frontend` directory and looks for common entry files (`App.tsx`, `index.tsx`, `App.jsx`, `index.jsx`).
- Each discovered frontend is bundled into `public/<name>/bundle.js` and the output directory is created automatically.
- The build is intentionally minimal: it bundles with sensible defaults (minify in production, sourcemaps in development) and exits non-zero on failure.

To add a new frontend app, create the folder `projects/<your-app>/frontend` and include one of the recognized entry files (for example `App.tsx`). Then run:

```bash
npm run build
```

If you want incremental builds or a dev server, I can add a `--watch` or `serve` option to `build.js` — tell me if you'd like that.

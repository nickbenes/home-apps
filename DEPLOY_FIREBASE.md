Deployment notes — Firebase Hosting (public/bills)
------------------------------------------------

This repository includes a small Firebase Hosting config that points to the `public/bills` static bundle.

Files added:

- `firebase.json` – hosting config with `public: "public/bills"` and an SPA rewrite to `index.html`.
- `.firebaserc` – placeholder for your Firebase project id. Replace `<YOUR_FIREBASE_PROJECT_ID>` or run `firebase use --add`.

Quick local deploy steps (one-time):

1. Install Firebase CLI locally (optional) or use the globally-installed `firebase` CLI:

```bash
npm install --save-dev firebase-tools
# or globally: npm install -g firebase-tools
```

2. Authenticate and select your project:

```bash
npx firebase login
npx firebase use --add
```

3. Build the frontends (if needed) so `public/bills` exists:

```bash
npm run build
```

4. Deploy hosting (this will deploy whatever is configured in `firebase.json`):

```bash
npx firebase deploy --only hosting
```

Notes:
- If you host multiple apps in the same Firebase project and want a distinct site target, update `firebase.json` to use `site` and deploy with `--only hosting:YOUR_TARGET`.
- CI/CD: you can add a GitHub Actions job that runs `npm ci`, `npm run build`, and `npx firebase deploy --token $FIREBASE_TOKEN --only hosting` using a repo secret.

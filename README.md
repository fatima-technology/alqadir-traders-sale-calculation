# Al Qadir Traders Sale Working

## Browser test
Open `www/index.html` directly in Chrome/Edge. This is the single-file browser test build requested.

## GitHub build outputs
1. Upload the complete ZIP contents to a GitHub repository (extract the ZIP first; do not upload only the ZIP archive).
2. Open **Actions** and run **Build Android APK** or **Build Windows EXE**.
3. Download the generated artifact from the completed workflow run.
4. A tag such as `v1.0.0` also triggers both workflows.

## Important current scope
- Android and Windows packaging workflows are scaffolded for GitHub Actions.
- The current business app is still the existing browser-based app. Its current IndexedDB/localStorage data model is not yet migrated to authenticated Firestore.
- Firebase configuration is a template only. Before enabling real multi-distributor accounts, create a Firebase project, enable Email/Password Authentication, register a Web App, and supply its public web config. Then the app's data layer and login screen must be migrated to tenant-scoped Firestore documents and tested with the rules.
- The Firestore rules template expects a trusted `tenantId` custom claim. Do not deploy it until a trusted server/Admin process assigns that claim. Never let a client choose its own tenant claim.
- Do not commit service-account JSON, private signing keys, passwords, or other secrets.

## Local build
- Windows: `npm install` then `npm run desktop:build`
- Android: `npm install`, `npx cap add android`, `npx cap sync android`, then build `android` with Gradle/Android Studio.

## Data safety
Keep a separate backup before replacing an existing live HTML file. The APK/EXE wrapper alone does not make browser-local data cloud-synced or protected from device loss.


Browser tab branding: AL QADIR TRADERS. AQ monogram favicon is embedded in www/index.html and also available at www/assets/aq-favicon.png.

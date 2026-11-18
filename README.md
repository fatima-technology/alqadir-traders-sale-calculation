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


## Firebase manual cloud backup integration
- `www/firebase-config.js` contains the Firebase Web App config for `alqadirtarderssale`.
- `www/firebase-cloud.js` adds Firebase email/password sign-in and explicit Upload Local Backup / Restore Cloud Backup actions.
- Local IndexedDB/localStorage remains the primary working store. Automatic/background sync is intentionally not enabled.
- Deploy `firebase/firestore.rules.ready-to-deploy` in Firebase Console → Firestore → Rules before using cloud backup. These rules allow each authenticated user to access only their own `/users/{uid}/agency/main` backup document.
- The cloud backup is limited to 850 KB because Firestore documents have a 1 MiB maximum. Larger data sets are blocked safely and remain local; a chunked Cloud Storage/Firestore design will be needed for larger datasets.
- Restore prompts for confirmation and downloads a local JSON safety backup before replacing current local business data. Test with a backup copy first.
- This is not yet multi-device live synchronization or a tenant/distributor architecture. Do not share one login between distributors.


## Firebase login screen
- A responsive sign-in / create-account screen is shown before the business app.
- Email/password sign-in uses Firebase Authentication.
- Create Account registers with Firebase Authentication and stores the supplied full name as the Firebase Auth display name.
- Forgot Password sends a Firebase password-reset email.
- The system remembers the signed-in session in the browser.
- This is authentication only, not an employee-role approval or tenant authorization system. Do not distribute public registration links to staff/customers until role-based access and owner approval are implemented.
- Existing local business data remains in the browser. Cloud backup/restore remains manual; real-time multi-device sync is not included.


## Owner-controlled registration and approval
- Trusted Main Owner UID is configured as `wC4l6PFQA8csi1DZTwsQEMuwOAk1`.
- Registration creates Firebase Authentication users and a Firestore `userProfiles/{uid}` document with `status: pending`, `role: pending`, and empty permissions.
- Pending/suspended accounts are blocked by the app's access gate.
- The Main Owner gets a User Management panel to approve, suspend/reactivate, assign display names and role labels, and save module/action permission selections.
- Firestore rules allow only the trusted Owner UID to change approval status, roles and permissions. A normal user cannot approve themselves.
- Replace the Firestore rules with `firebase/firestore.rules.owner-approval.txt` and publish them before deploying this build.
- Important: the existing business modules still use browser-local data. The permission selections are stored, but full per-module enforcement and multi-user cloud data separation require the next migration stage. Do not treat this build as complete multi-user production security until that work is finished.


## Report Logo Setup location
- Report Logo Setup has been moved out of the Reports navigation and placed inside Other Settings.
- Other Settings remains accessible through the existing hidden/locked settings flow (seven header-logo clicks, then Owner PIN as configured).
- Logo controls, element IDs, and existing report-layout functions are preserved.


## Shared Firebase cloud sync (AL QADIR TRADERS)

This build adds the first shared-company cloud sync foundation. The shared Firestore document path is `companies/al-qadir-traders/agency/main`. The Main Owner must publish `firebase/firestore.rules.owner-approval.txt` in Firebase Console and then sign in to the app and press **Connect Shared Cloud Data** in the Firebase Account & Cloud Backup panel. On first initialization, the app downloads a JSON safety copy and uploads the current local dataset. Other approved accounts can then read the shared cloud dataset; their writes are allowed by Firestore only when their profile contains at least one configured write permission.

When an approved account opens the app, it subscribes to the shared cloud document. Local saves are queued and sent to Firestore after a short debounce. Cloud updates are applied locally and a safety JSON is downloaded before replacing local data when the Owner connects to an already initialized cloud document. The existing per-user manual backup/restore remains available.

**Important limitations of this first sync foundation:** the current business data is stored as one Firestore document and the app refuses live sync above 850 KB (Firestore document-size limit safety margin). It is a whole-dataset sync, not record-level conflict resolution; avoid simultaneous edits to the same records on multiple devices until transaction-based conflict handling is implemented. Firestore rules currently enforce approval and a coarse “at least one write permission” gate, not every individual module/action against the specific changed record. Existing local data remains local until the Owner explicitly initializes the shared cloud document. Keep an independent backup before first initialization.

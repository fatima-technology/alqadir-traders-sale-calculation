# AL QADIR TRADERS — Sale System (v13)

## GitHub par upload karne ka tareeqa
1. Is ZIP ko computer par **Extract** karein.
2. Extract hone wale folder ke **andar ka sara content** select karein — `www`, `electron`, `.github`, `firebase`, `package.json`, etc.
3. GitHub repository ke root mein ye tamam files/folders upload karein. `task` naam ka extra parent folder upload na karein.
4. GitHub mein **Actions** tab kholein. `Build Android APK` ya `Build Windows EXE` workflow select karke **Run workflow** karein.
5. Workflow complete hone par us run ke **Artifacts** section se APK/EXE download karein.

## Current build
- Existing AL QADIR TRADERS Sale System preserved.
- Mobile responsive layout included for Android-sized screens.
- Android (Capacitor) and Windows (Electron) packaging workflows included.
- Report Logo Setup is under the existing locked **Other Settings** area.
- Firebase Email/Password login and Owner approval foundation are included.

## Important — Firebase cloud sync is NOT finished yet
- Business records still use the existing browser/device-local IndexedDB/localStorage data model.
- Firebase login and manual backup/restore foundation do **not** mean automatic multi-device synchronization.
- Do not enter important live business data expecting it to appear automatically on another device until the cloud data migration is completed and tested.
- The next development stage is to migrate all business data to authenticated, user/company-scoped Firestore storage, implement live updates and safe offline queueing, and enforce permissions in the data layer.
- Existing Firestore Owner-approval rules were prepared separately. Do not replace published rules casually; confirm the final data model and security rules together during the Firebase stage.

## Local builds
### Windows EXE
```bash
npm install
npm run desktop:build
```

### Android APK (debug build)
```bash
npm install
npx cap add android
npx cap sync android
```
Then open/build the generated Android project with Android Studio/Gradle. GitHub Actions builds a debug APK artifact for testing; Play Store/release signing is a separate step.

## Data safety
Keep a backup of the current live data and existing GitHub repository before replacing files. Never commit service-account JSON, private signing keys, passwords, or other private secrets. Firebase web app config is client-side configuration; Firestore Security Rules must protect all business data.

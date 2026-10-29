# Releasing EdgeLabHub mobile

How a version gets from this folder to people's phones. Version 1.0.0 goes out as a direct APK download from the website; Google Play and the App Store come later (see the end).

## Before you start (once per release)
1. **Deploy the website and backend** (`edgelab-web`). The app depends on them:
   - Google sign-in returning to the app (`/auth/mobile` page and `/.well-known/assetlinks.json`),
   - the trade open/close pushes,
   - the download route for the installer.
2. **On the server**, next to `docker-compose.prod.yml`, make the folder the installer lives in, then recreate Caddy so it mounts the folder and loads the new `deploy/Caddyfile`:
   ```bash
   mkdir -p downloads
   docker compose -f docker-compose.prod.yml up -d caddy
   ```
3. Check the ownership file is live (Android uses it to open the app straight from the Google sign-in return):
   ```bash
   curl -s https://edgelabhub.com/.well-known/assetlinks.json
   ```
   It must print the JSON with package `app.edgelabhub.mobile`. Its fingerprint is the one of the EAS signing key; every APK from this project uses that key.

## Build
```bash
git add -A && git commit -m "Release 1.0.0" && git tag v1.0.0   # a build you can reproduce
npx eas-cli build -p android --profile release                  # an installable .apk; the Android version number goes up by itself
```
The `release` profile is `preview` with an automatic version number, so a later APK always installs over an earlier one. The download link appears when the build finishes (about 15 to 20 minutes).

## Test the APK before anyone else gets it
Uninstall every EdgeLabHub on the test phone (including the dev app), install the new APK, and check:
- [ ] The app opens (a release build once failed to open: this is the check that catches that).
- [ ] Sign in with email and password. Sign out. Sign in with **Continue with Google**: it should return to the app with no "open the external app?" question.
- [ ] Home loads: Today, Live trades (with a trade open), guard rails, ticker, market sessions.
- [ ] Journal: all three tabs, log a trade, open a day on the Calendar tab, open a screenshot and zoom.
- [ ] Markets: search, open a stock. Portfolio: broker sign-in if you use one.
- [ ] More → Settings → **Send a test notification** arrives. Developer items are not visible (no Preview buttons, no server address, no "Advanced" on sign-in).
- [ ] Profile: edit the name, change nothing else, sign out.

## Publish
1. Copy the APK to the server (the path and user are yours; the key is `edgelab-key.pem`):
   ```bash
   scp -i edgelab-key.pem edgelabhub-1.0.0.apk <user>@<server>:<folder with docker-compose.prod.yml>/downloads/
   ```
   Download it first from the build page (`curl -L -o edgelabhub-1.0.0.apk "<link from the build>"`). EAS keeps build files for a limited time, so the copy on your server is the permanent one.
2. In `edgelab-frontend/lib/mobile-app.ts` set the link, then deploy the website:
   ```ts
   androidApk: "/downloads/edgelabhub-1.0.0.apk",
   ```
3. Check it from outside: `curl -I https://edgelabhub.com/downloads/edgelabhub-1.0.0.apk` should say `200` and `application/vnd.android.package-archive`. Then open `https://edgelabhub.com/app` on an Android phone and install from the button.

Because the file is not from Google Play, Android asks to allow installs from the browser, and Play Protect may say it does not know the app ("More details", then "Install anyway"). The download page tells people this.

## The next version
Bump `version` in `app.config.js` and in `edgelab-frontend/lib/mobile-app.ts`, build with the same `release` profile, test, upload under a **new file name** (`edgelabhub-1.1.0.apk`), and change the link. Keep the old file for a while.

## Before Google Play or the App Store (not done yet)
- **Account deletion.** Both stores require a way to delete an account from inside the app, plus a web page for the store form, because the app lets people create an account (Google sign-in does). Today the privacy policy says to email. This needs a server feature and a button in Profile.
- Google Play: a Play Console account, `eas build --profile production` (an .aab), the store listing, the Data safety form, the financial-features declaration and a content rating. Add Play's app-signing key fingerprint to `assetlinks.json` next to the current one, or Google sign-in will show the "open the external app?" question again for Play installs.
- App Store: an Apple Developer account, an iOS build, and a universal-links setup for Google sign-in (Android's `assetlinks.json` does not cover iPhone).
- The live-trades notification bar (`LIVE_NOTIFICATION=1`, profile `live`) is not in normal builds: it needs a device test first.

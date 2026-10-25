# Daybook Android rebuild (Stage 1)

This project uses the **actual uploaded `Daybook (5).html`** as its starting point. The existing Daybook UI, task model, stats, and schema-4 JSON backup format are preserved. The HTML has only been adjusted to route export through a native share/save flow, make AI-insight availability honest in a standalone Android app, and load a small Capacitor bridge. The bridge is bundled with esbuild before Capacitor sync, so Android WebView does not have to resolve npm import names directly.

## What's in this stage

- Capacitor Android project setup, generated from source during the build.
- Local notifications based on the existing task `date` and `rem` fields. Changes to the app's existing `daybook1` localStorage key trigger a reminder resync.
- JSON backup export through Android's share sheet, so the user can choose a destination rather than depending on Claude's download tool.
- Optional online AI insights. The current insight implementation works only where a supported `window.claude.use` runtime is provided. In the standalone Android app, it clearly reports that online insights are not configured instead of pretending it generated advice. No AI API key or paid service is bundled.
- GitHub Actions workflow to produce a debug APK artifact.

## Important limits for Stage 1

1. **This ZIP is source, not an APK.** GitHub Actions or a local Android build must compile it.
2. **Reminders need real-device testing.** Android notification permission, exact-alarm policy, battery optimization, and OEM background restrictions can affect delivery time. Do not rely on it for safety-critical alarms. The app asks for notification permission when future reminders exist.
3. **Backup restore needs testing on-device.** The original import flow is preserved; the new export uses a shareable JSON file. Verify export, then import the same file and confirm task counts and history before trusting it as your only backup.
4. **Browser and Android data are separate.** Existing browser `localStorage` does not automatically migrate into the installed app. Export a JSON backup from the old version and import it into Android after installing the build.
5. **PC sync is deliberately not implemented yet.** This stage keeps local-first data and the existing JSON schema so a later sync layer can be designed without rushing cloud storage into an unreliable first release.
6. **Font loading:** the source still references Google Fonts. The system-font fallbacks work offline, but Inter may not load without internet. We can bundle the font in a later polish pass.

## Build with GitHub Actions

1. Create a new GitHub repository and upload the contents of this folder (not the enclosing ZIP).
2. Commit the files to the `main` branch.
3. Open **Actions → Build Daybook Android APK → Run workflow**. A push to `main` also starts a build.
4. Open the completed run and download the `daybook-debug-apk` artifact.
5. Transfer `app-debug.apk` to your Android phone and install it. Android may ask you to allow installation from that source.

If the workflow fails, share the failing step and its log. Do not randomly change Gradle or dependency versions before checking the actual error.

## Build locally

Requires Node.js and JDK 21. Run:

```bash
npm install
npm run android:setup
cd android
./gradlew assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

## First device test checklist

- [ ] App launches and existing UI is intact.
- [ ] Create a task with a reminder 3–5 minutes in the future; grant notification permission.
- [ ] Confirm one notification arrives, then edit the reminder and confirm the old time does not also fire.
- [ ] Delete a task with a reminder and confirm it no longer fires.
- [ ] Export backup and save the JSON file somewhere accessible.
- [ ] Import the exported file and verify tasks, ended-day history, categories, and settings.
- [ ] Force-close and reopen the app; verify data remains.
- [ ] Test reminders after reboot and after battery optimization settings are changed.
- [ ] Confirm online insights report unavailable in the standalone build until an actual online provider is intentionally configured.

## Next stage after the first build

Fix issues found in device testing, then improve import/export reliability and notification permission/exact-alarm handling. Only after those pass should we add the PC sync design.

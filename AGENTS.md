# AGENTS.md

## Cursor Cloud specific instructions

Quranify (`quran-streamer`) is a single client-side React 19 + Vite 8 + TypeScript PWA for streaming Quran audio. There is **no backend in this repo**; all audio/reciter data comes from third-party public APIs/CDNs (`mp3quran.net`, `everyayah.com`), so outbound internet is required for audio playback to work. Standard scripts live in `package.json` (`dev`, `build`, `lint`, `preview`) and mobile/Capacitor docs are in `MOBILE.md`.

Notes for future agents:
- Node 20+ is required (Vite 8). The VM's default Node (v22) works fine.
- Run the app in dev with `npm run dev` (Vite serves on `http://localhost:5173`). Use `npm run dev -- --host` if you need it reachable on the network interface.
- `npm run lint` currently reports pre-existing errors/warnings (mostly `react-hooks/set-state-in-effect`) that exist on `main` and are unrelated to environment setup — do not "fix" them as part of setup work.
- The service worker / offline cache (`public/sw.js`, `src/utils/offlineManager.ts`) is only active in production builds (`import.meta.env.PROD`), not in `npm run dev`. Use `npm run build` + `npm run preview` to exercise offline/PWA behavior.
- Capacitor native builds (`cap:sync`, `cap:android`, `cap:ios`) need heavy platform toolchains (Android Studio/JDK 17, or macOS + Xcode) that are not installed here — skip unless mobile work is explicitly requested.
- No `.env` / secrets are needed; API endpoints are hardcoded to public URLs.

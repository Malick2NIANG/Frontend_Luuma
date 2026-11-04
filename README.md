# Luuma Frontend

Expo Router / React Native client for the Luuma marketplace.

## Local development

1. Install Node.js 22.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. Run `npm ci`.
4. Start Expo with `npm start`; press `a` for Android or `w` for web.

## Branch flow and CI

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the `feature/*` → `develop` → `staging` → `preprod` → `main` promotion flow and required reviews.

GitHub Actions installs the locked dependencies and exports the Android bundle on pull requests and pushes to the shared branches. App-store builds and deployment are not configured yet.

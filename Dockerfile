# ============================================================
#  Luuma — version web de l'application Expo, servie par nginx
# ============================================================
# Ce conteneur sert l'application dans le NAVIGATEUR. Sur téléphone, on
# continue d'utiliser `npx expo start` (Expo Go / dev build) : Metro doit voir
# le téléphone sur le réseau local, ce qu'un conteneur rend inutilement fragile.

# ── Étape 1 : export web ────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# Les variables EXPO_PUBLIC_* sont figées dans le bundle À LA COMPILATION :
# changer l'une d'elles demande un `docker compose build front`.
ARG EXPO_PUBLIC_API_PORT=3001
ARG EXPO_PUBLIC_API_URL=
# `true` : l'API est jointe sur l'origine de la page, via le relais nginx.
ARG EXPO_PUBLIC_API_SAME_ORIGIN=true
ENV EXPO_PUBLIC_API_PORT=$EXPO_PUBLIC_API_PORT \
    EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_PUBLIC_API_SAME_ORIGIN=$EXPO_PUBLIC_API_SAME_ORIGIN

RUN npx expo export --platform web --output-dir dist

# ── Étape 2 : service statique ──────────────────────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

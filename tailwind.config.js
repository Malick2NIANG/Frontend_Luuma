// Kept in sync with constants/colors.ts by hand: tailwind.config.js is loaded
// by plain Node (no TS/ESM transform available here), so it can't import that
// file directly.
const luumColors = {
  primary: '#0B5C38',
  accent: '#35C27A',
  gold: '#F5C518',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  // `app.json` fixe userInterfaceStyle: "light". Avec le mode 'media' par
  // défaut, NativeWind refuse qu'on lui impose un thème et lève une erreur
  // au démarrage sur le web. En mode 'class', le thème se pilote depuis
  // l'application — ce qu'Expo fait déjà.
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: luumColors,
    },
  },
  plugins: [],
};

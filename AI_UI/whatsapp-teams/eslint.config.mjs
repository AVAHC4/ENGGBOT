// Local ESLint flat config for the nested Teams app
// Isolates this app from the parent AI_UI ESLint run
// You can replace this later with a proper Next 15/React 19 config

export default [
  {
    // For now, ignore everything to prevent parent lint bleed-through
    ignores: ["**/*"],
  },
];

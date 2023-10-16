/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "eslint-plugin-tsdoc"],
  rules: {
    "tsdoc/syntax": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
  },
  root: true,
};

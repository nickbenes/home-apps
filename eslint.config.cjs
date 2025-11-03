// Minimal ESLint flat config (v9+) for this repo.
// It enables TypeScript and React linting with a small, non-opinionated rule set.
module.exports = [
  // Ignore generated and vendor folders
  {
    ignores: ["node_modules/**", "public/**", "coverage/**"],
  },

  // Apply to JS/TS/JSX/TSX files
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    // Load plugins (will be installed as devDependencies)
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // TypeScript aware no-unused-vars
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Relax React in-scope requirement for new JSX runtimes
      'react/react-in-jsx-scope': 'off',

      // Prefer warnings for console in this sandbox
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'data'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
    languageOptions: {
      globals: {
        AbortSignal: 'readonly', Buffer: 'readonly', console: 'readonly', document: 'readonly', fetch: 'readonly',
        File: 'readonly', FileReader: 'readonly', localStorage: 'readonly', process: 'readonly', window: 'readonly',
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);

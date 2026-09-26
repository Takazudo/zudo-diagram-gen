import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'worktrees/**',
      '.zfb*/**',
      '.generated/**',
      'src/generated/**',
      'public/previews/**',
      'artifacts/**',
      'test-output/**',
      'pages/tones.tsx',
      'pages/workbench.tsx',
      'pages/examples/*.tsx',
    ],
  },
  {
    ...eslint.configs.recommended,
    rules: { ...eslint.configs.recommended.rules, 'preserve-caught-error': 'off' },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  { files: ['**/*.d.ts'], rules: { 'no-unused-vars': 'off' } },
];

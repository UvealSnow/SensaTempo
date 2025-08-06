import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript recommended rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // General JavaScript/TypeScript rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-extra-boolean-cast': 'error',
    },
  },
  
  // Astro files configuration
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Astro-specific rules
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-define-vars-in-style': 'error',
    },
  },
  
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'public/**',
      '*.config.{js,mjs,cjs,ts}',
      'pnpm-lock.yaml',
    ],
  },
];

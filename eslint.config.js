import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-undef': 'off'
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  {
    files: ['src/**/*.{ts,js,svelte}'],
    ignores: ['**/*.spec.*', '**/*.test.*', 'src/lib/test-utils/**', 'e2e/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/lib/domain/**'],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'svelte',
              message: 'Domain layer must remain framework-agnostic and must not import Svelte.'
            },
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ],
          patterns: [
            {
              group: [
                '@sveltejs/*',
                '@sveltejs/**',
                'svelte/*',
                '$lib/components',
                '$lib/components/*',
                '$lib/components/**',
                '$lib/stores',
                '$lib/stores/*',
                '$lib/stores/**',
                '$lib/application',
                '$lib/application/*',
                '$lib/application/**',
                '$lib/infrastructure',
                '$lib/infrastructure/*',
                '$lib/infrastructure/**',
                '../components/*',
                '../components/**',
                '../stores/*',
                '../stores/**',
                '../application/*',
                '../application/**',
                '../infrastructure/*',
                '../infrastructure/**',
                '../../routes/*',
                '../../routes/**'
              ],
              message: 'Domain layer must not depend on application, infrastructure, or routes.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/lib/application/useCases/**'],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ],
          patterns: [
            {
              group: [
                '$lib/components',
                '$lib/components/*',
                '$lib/components/**',
                '$lib/stores',
                '$lib/stores/*',
                '$lib/stores/**',
                '$lib/contexts',
                '$lib/contexts/*',
                '$lib/contexts/**',
                '$lib/infrastructure',
                '$lib/infrastructure/*',
                '$lib/infrastructure/**',
                '../../components/*',
                '../../components/**',
                '../../stores/*',
                '../../stores/**',
                '../../contexts/*',
                '../../contexts/**',
                '../infrastructure/*',
                '../infrastructure/**',
                '../../../routes/*',
                '../../../routes/**'
              ],
              message: 'Use cases must depend only on domain, ports, and utilities.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/lib/application/ports/**'],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ],
          patterns: [
            {
              group: [
                '$lib/components',
                '$lib/components/*',
                '$lib/components/**',
                '$lib/stores',
                '$lib/stores/*',
                '$lib/stores/**',
                '$lib/contexts',
                '$lib/contexts/*',
                '$lib/contexts/**',
                '$lib/infrastructure',
                '$lib/infrastructure/*',
                '$lib/infrastructure/**',
                '../../components/*',
                '../../components/**',
                '../../stores/*',
                '../../stores/**',
                '../../contexts/*',
                '../../contexts/**',
                '../../infrastructure/*',
                '../../infrastructure/**',
                '../../../routes/*',
                '../../../routes/**'
              ],
              message: 'Application ports must not depend on infrastructure, routes, or UI modules.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/lib/components/**'],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ],
          patterns: [
            {
              group: [
                '$lib/infrastructure',
                '$lib/infrastructure/*',
                '$lib/infrastructure/**',
                '../../infrastructure/*',
                '../../infrastructure/**'
              ],
              message:
                'Components should use application facades/context, not infrastructure modules directly.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/routes/**'],
    ignores: ['**/*.spec.*', '**/*.test.*', 'src/routes/+layout.svelte'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '$lib/test-utils',
              message: 'Production code must not import $lib/test-utils.'
            },
            {
              name: '$lib/types',
              message: 'Import domain types from $lib/domain (utilities stay under $lib/types/*).'
            }
          ],
          patterns: [
            {
              group: [
                '$lib/infrastructure',
                '$lib/infrastructure/*',
                '$lib/infrastructure/**',
                '../lib/infrastructure/*',
                '../lib/infrastructure/**'
              ],
              message:
                'Routes should use appEnvUseCases/context and avoid direct infrastructure imports.'
            }
          ]
        }
      ]
    }
  }
);

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
		excludedFiles: ['**/*.spec.*', '**/*.test.*', 'src/lib/test-utils/**', 'e2e/**'],
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
		excludedFiles: ['**/*.spec.*', '**/*.test.*'],
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
		excludedFiles: ['**/*.spec.*', '**/*.test.*'],
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
								'../infrastructure/*',
								'../infrastructure/**',
								'../../routes/*',
								'../../routes/**'
							],
							message: 'Use cases must depend only on domain, ports, and utilities.'
						}
					]
				}
			]
		}
	},
	{
		files: ['src/routes/**'],
		excludedFiles: ['**/*.spec.*', '**/*.test.*'],
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
								'../lib/infrastructure/*',
								'../lib/infrastructure/**',
								'../lib/application/useCases/*',
								'../lib/application/useCases/**'
							],
							message:
								'Routes should use appEnvUseCases and context, not infrastructure or use cases directly.'
						}
					]
				}
			]
		}
	}
);

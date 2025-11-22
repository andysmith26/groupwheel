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
			'no-undef': 'off',

			// Global architectural import rules (coarse-grained; refined per-filetype below if needed).
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						// Domain must not import application, infrastructure, or routes.
						{
							group: [
								'../application/*',
								'../application/**',
								'../infrastructure/*',
								'../infrastructure/**',
								'../../routes/*',
								'../../routes/**'
							],
							targets: ['src/lib/domain/**'],
							message: 'Domain layer must not depend on application, infrastructure, or routes.'
						},
						// Application/useCases must not import infrastructure or routes.
						{
							group: [
								'../infrastructure/*',
								'../infrastructure/**',
								'../../routes/*',
								'../../routes/**'
							],
							targets: ['src/lib/application/useCases/**'],
							message: 'Use cases must depend only on domain, ports, and utilities.'
						},
						// UI (routes) must not import infrastructure or use cases directly.
						{
							group: [
								'../lib/infrastructure/*',
								'../lib/infrastructure/**',
								'../lib/application/useCases/*',
								'../lib/application/useCases/**'
							],
							targets: ['src/routes/**'],
							message:
								'Routes should use appEnvUseCases and context, not infrastructure or use cases directly.'
						}
					]
				}
			]
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
	}
);

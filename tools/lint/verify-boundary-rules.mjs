import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const eslint = new ESLint({
	cwd: repoRoot,
	overrideConfigFile: path.join(repoRoot, 'eslint.config.js')
});

const cases = [
	{
		name: 'domain disallows infrastructure import',
		filePath: 'src/lib/domain/__boundary-fixtures__/domain-disallowed.ts',
		code: "import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';\n",
		expectRestrictedImportError: true
	},
	{
		name: 'domain allows domain import',
		filePath: 'src/lib/domain/__boundary-fixtures__/domain-allowed.ts',
		code: "import { createStudent } from '$lib/domain/student';\nexport const value = createStudent;\n",
		expectRestrictedImportError: false
	},
	{
		name: 'useCase disallows route import',
		filePath: 'src/lib/application/useCases/__boundary-fixtures__/usecase-disallowed.ts',
		code: "import '../../../routes/+page.svelte';\n",
		expectRestrictedImportError: true
	},
	{
		name: 'useCase allows ports import',
		filePath: 'src/lib/application/useCases/__boundary-fixtures__/usecase-allowed.ts',
		code: "import type { IdGenerator } from '$lib/application/ports/IdGenerator';\nexport type PortType = IdGenerator;\n",
		expectRestrictedImportError: false
	},
	{
		name: 'ports disallow infrastructure import',
		filePath: 'src/lib/application/ports/__boundary-fixtures__/ports-disallowed.ts',
		code: "import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';\n",
		expectRestrictedImportError: true
	},
	{
		name: 'ports allow domain type import',
		filePath: 'src/lib/application/ports/__boundary-fixtures__/ports-allowed.ts',
		code: "import type { Student } from '$lib/domain/student';\nexport type StudentPortType = Student;\n",
		expectRestrictedImportError: false
	},
	{
		name: 'components disallow infrastructure import',
		filePath: 'src/lib/components/__boundary-fixtures__/components-disallowed.ts',
		code: "import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';\n",
		expectRestrictedImportError: true
	},
	{
		name: 'components allow type-only useCase import',
		filePath: 'src/lib/components/__boundary-fixtures__/components-allowed.ts',
		code: "import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';\nexport type X = ParsedPreference;\n",
		expectRestrictedImportError: false
	},
	{
		name: 'routes disallow infrastructure import',
		filePath: 'src/routes/__boundary-fixtures__/routes-disallowed.ts',
		code: "import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';\n",
		expectRestrictedImportError: true
	},
	{
		name: 'routes allow type-only useCase import',
		filePath: 'src/routes/__boundary-fixtures__/routes-allowed.ts',
		code: "import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';\nexport type Y = ParsedPreference;\n",
		expectRestrictedImportError: false
	}
];

let hasFailure = false;

for (const testCase of cases) {
	const absoluteFilePath = path.join(repoRoot, testCase.filePath);
	const [result] = await eslint.lintText(testCase.code, { filePath: absoluteFilePath });
	const restrictedImportMessages = result.messages.filter(
		(message) => message.ruleId === 'no-restricted-imports'
	);
	const hasRestrictedImportError = restrictedImportMessages.length > 0;

	if (testCase.expectRestrictedImportError !== hasRestrictedImportError) {
		hasFailure = true;
		console.error(`✗ ${testCase.name}`);
		console.error(
			`  expected no-restricted-imports: ${testCase.expectRestrictedImportError ? 'error' : 'ok'}`
		);
		console.error(`  actual no-restricted-imports: ${hasRestrictedImportError ? 'error' : 'ok'}`);
		if (result.messages.length > 0) {
			for (const message of result.messages) {
				console.error(`  - [${message.ruleId ?? 'unknown'}] ${message.message}`);
			}
		}
	} else {
		console.log(`✓ ${testCase.name}`);
	}
}

if (hasFailure) {
	console.error('Boundary fixture validation failed.');
	process.exit(1);
}

console.log('Boundary fixture validation passed.');

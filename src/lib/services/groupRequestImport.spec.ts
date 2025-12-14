import { describe, it, expect } from 'vitest';
import { parseGroupRequests, generateExampleCsv } from './groupRequestImport';

describe('parseGroupRequests', () => {
	const defaultOptions = {
		groupNames: ['Art Club', 'Music Club', 'Drama Club', 'Chess Club'],
		studentIds: ['alice@test.com', 'bob@test.com', 'carol@test.com']
	};

	it('parses basic CSV with header row', () => {
		const csv = `Student ID,Choice 1,Choice 2,Choice 3
alice@test.com,Art Club,Music Club,Drama Club
bob@test.com,Chess Club,Art Club,`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(2);
		expect(result.preferences[0].studentId).toBe('alice@test.com');
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club', 'Music Club', 'Drama Club']);
		expect(result.preferences[1].studentId).toBe('bob@test.com');
		expect(result.preferences[1].likeGroupIds).toEqual(['Chess Club', 'Art Club']);
		expect(result.stats.imported).toBe(2);
		expect(result.stats.skipped).toBe(0);
	});

	it('parses TSV format', () => {
		const tsv = `Student ID\tChoice 1\tChoice 2
alice@test.com\tArt Club\tMusic Club
bob@test.com\tDrama Club\t`;

		const result = parseGroupRequests(tsv, defaultOptions);

		expect(result.preferences).toHaveLength(2);
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club', 'Music Club']);
		expect(result.preferences[1].likeGroupIds).toEqual(['Drama Club']);
	});

	it('handles case-insensitive group name matching', () => {
		const csv = `Student ID,Choice 1
alice@test.com,ART CLUB
bob@test.com,art club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(2);
		// Both should map to the canonical "Art Club" name
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club']);
		expect(result.preferences[1].likeGroupIds).toEqual(['Art Club']);
	});

	it('handles case-insensitive student ID matching', () => {
		const csv = `Student ID,Choice 1
ALICE@TEST.COM,Art Club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(1);
		expect(result.preferences[0].studentId).toBe('alice@test.com');
	});

	it('warns on unknown students', () => {
		const csv = `Student ID,Choice 1
unknown@test.com,Art Club
alice@test.com,Music Club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(1);
		expect(result.preferences[0].studentId).toBe('alice@test.com');
		expect(result.stats.skipped).toBe(1);
		expect(result.stats.unknownStudents).toContain('unknown@test.com');
		expect(result.warnings).toContainEqual(expect.stringContaining('Unknown student'));
	});

	it('warns on unknown groups', () => {
		const csv = `Student ID,Choice 1,Choice 2
alice@test.com,Art Club,Unknown Group`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(1);
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club']);
		expect(result.stats.unknownGroups).toContain('Unknown Group');
		expect(result.warnings).toContainEqual(expect.stringContaining('Unknown group'));
	});

	it('skips rows with empty student ID', () => {
		const csv = `Student ID,Choice 1
,Art Club
alice@test.com,Music Club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(1);
		expect(result.stats.skipped).toBe(1);
	});

	it('skips students with no valid group choices', () => {
		const csv = `Student ID,Choice 1
alice@test.com,Invalid Group
bob@test.com,Art Club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(1);
		expect(result.preferences[0].studentId).toBe('bob@test.com');
		expect(result.stats.imported).toBe(1);
		expect(result.stats.skipped).toBe(1);
	});

	it('returns error for insufficient data', () => {
		const csv = `Student ID`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(0);
		expect(result.warnings).toContainEqual(expect.stringContaining('header row'));
	});

	it('returns error for missing student ID column', () => {
		const csv = `Name,Choice 1
Alice,Art Club`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(0);
		expect(result.warnings).toContainEqual(expect.stringContaining('student ID column'));
	});

	it('respects maxChoices option', () => {
		const csv = `Student ID,C1,C2,C3,C4,C5
alice@test.com,Art Club,Music Club,Drama Club,Chess Club,Art Club`;

		const result = parseGroupRequests(csv, { ...defaultOptions, maxChoices: 2 });

		expect(result.preferences[0].likeGroupIds).toHaveLength(2);
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club', 'Music Club']);
	});

	it('handles various header name formats', () => {
		// Test "ID" column name
		let csv = `ID,Choice 1
alice@test.com,Art Club`;
		let result = parseGroupRequests(csv, defaultOptions);
		expect(result.preferences).toHaveLength(1);

		// Test "Email" column name
		csv = `Email,Choice 1
alice@test.com,Art Club`;
		result = parseGroupRequests(csv, defaultOptions);
		expect(result.preferences).toHaveLength(1);

		// Test columns without "choice" in name
		csv = `Student ID,Option 1,Option 2
alice@test.com,Art Club,Music Club`;
		result = parseGroupRequests(csv, defaultOptions);
		expect(result.preferences).toHaveLength(1);
	});

	it('handles quoted CSV fields', () => {
		const csv = `Student ID,Choice 1
"alice@test.com","Art Club"
bob@test.com,"Music Club"`;

		const result = parseGroupRequests(csv, defaultOptions);

		expect(result.preferences).toHaveLength(2);
		expect(result.preferences[0].likeGroupIds).toEqual(['Art Club']);
	});
});

describe('generateExampleCsv', () => {
	it('generates example CSV with provided group names', () => {
		const csv = generateExampleCsv(['Team A', 'Team B', 'Team C']);

		expect(csv).toContain('Student ID');
		expect(csv).toContain('Choice 1');
		expect(csv).toContain('Team A');
		expect(csv).toContain('Team B');
	});

	it('handles fewer than 3 groups', () => {
		const csv = generateExampleCsv(['Only Group']);

		expect(csv).toContain('Only Group');
	});
});

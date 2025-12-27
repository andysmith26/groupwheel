/**
 * Sync API endpoint.
 *
 * Handles push/pull operations for syncing data between client and server.
 * Requires authentication via Bearer token.
 *
 * NOTE: This is a stub implementation. A real implementation would need:
 * - A database backend (PostgreSQL, etc.)
 * - Proper conflict resolution
 * - User data isolation
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import type { SyncEntityType } from '$lib/application/ports';

// In-memory storage for development/testing
// In production, this would be replaced with a real database
const storage: Map<string, Map<SyncEntityType, Map<string, unknown>>> = new Map();

/**
 * Validate the authorization header and extract user ID.
 */
function validateAuth(request: Request): string {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, 'Unauthorized');
	}

	const token = authHeader.slice(7);
	if (!token) {
		throw error(401, 'Unauthorized');
	}

	// TODO: Validate token and extract user ID
	// For now, use a hash of the token as user ID
	// In production, decode JWT and verify with Google
	return btoa(token).slice(0, 32);
}

/**
 * Get or create user storage.
 */
function getUserStorage(userId: string): Map<SyncEntityType, Map<string, unknown>> {
	if (!storage.has(userId)) {
		storage.set(userId, new Map());
	}
	return storage.get(userId)!;
}

/**
 * Get or create entity storage for a user.
 */
function getEntityStorage(userId: string, entityType: SyncEntityType): Map<string, unknown> {
	const userStorage = getUserStorage(userId);
	if (!userStorage.has(entityType)) {
		userStorage.set(entityType, new Map());
	}
	return userStorage.get(entityType)!;
}

/**
 * Handle GET requests (pull data).
 */
export const GET: RequestHandler = async ({ request, url }) => {
	const userId = validateAuth(request);
	const entityType = url.searchParams.get('entityType') as SyncEntityType | null;

	if (!entityType) {
		throw error(400, 'Missing entityType parameter');
	}

	const validTypes: SyncEntityType[] = [
		'students',
		'staff',
		'pools',
		'programs',
		'scenarios',
		'preferences',
		'groupTemplates'
	];

	if (!validTypes.includes(entityType)) {
		throw error(400, 'Invalid entityType');
	}

	const entityStorage = getEntityStorage(userId, entityType);
	const entities = Array.from(entityStorage.values());

	return json({
		entities,
		lastSyncedAt: new Date().toISOString()
	});
};

/**
 * Handle POST requests (push data).
 */
export const POST: RequestHandler = async ({ request }) => {
	const userId = validateAuth(request);

	let body: {
		operation: 'push';
		entityType: SyncEntityType;
		entities: Array<{ id: string; [key: string]: unknown }>;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { operation, entityType, entities } = body;

	if (operation !== 'push') {
		throw error(400, 'Invalid operation');
	}

	const validTypes: SyncEntityType[] = [
		'students',
		'staff',
		'pools',
		'programs',
		'scenarios',
		'preferences',
		'groupTemplates'
	];

	if (!entityType || !validTypes.includes(entityType)) {
		throw error(400, 'Invalid entityType');
	}

	if (!Array.isArray(entities)) {
		throw error(400, 'entities must be an array');
	}

	const entityStorage = getEntityStorage(userId, entityType);

	// Save entities (last-write-wins)
	for (const entity of entities) {
		if (!entity.id) {
			continue; // Skip entities without ID
		}
		entityStorage.set(entity.id, {
			...entity,
			_syncedAt: new Date().toISOString()
		});
	}

	return json({
		success: true,
		syncedCount: entities.length,
		lastSyncedAt: new Date().toISOString()
	});
};

/**
 * Handle DELETE requests (delete entities).
 */
export const DELETE: RequestHandler = async ({ request, url }) => {
	const userId = validateAuth(request);
	const entityType = url.searchParams.get('entityType') as SyncEntityType | null;
	const entityId = url.searchParams.get('entityId');

	if (!entityType || !entityId) {
		throw error(400, 'Missing entityType or entityId parameter');
	}

	const entityStorage = getEntityStorage(userId, entityType);
	const deleted = entityStorage.delete(entityId);

	return json({
		success: true,
		deleted
	});
};

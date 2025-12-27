/**
 * Get Current User Use Case
 *
 * Retrieves the currently authenticated user.
 *
 * @module application/useCases/getCurrentUser
 */

import type { AuthService, AuthUser } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Get the currently authenticated user.
 *
 * Returns null if no user is authenticated (anonymous mode).
 */
export async function getCurrentUser(deps: {
	authService: AuthService;
}): Promise<Result<AuthUser | null, never>> {
	const user = await deps.authService.getUser();
	return ok(user);
}

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated(deps: { authService: AuthService }): boolean {
	return deps.authService.isAuthenticated();
}

/**
 * Subscribe to authentication state changes.
 *
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
	deps: { authService: AuthService },
	callback: (user: AuthUser | null) => void
): () => void {
	return deps.authService.onAuthStateChange(callback);
}

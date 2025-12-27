/**
 * Logout Use Case
 *
 * Logs out the current user and clears auth state.
 *
 * @module application/useCases/logout
 */

import type { AuthService } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

export type LogoutError = { type: 'LOGOUT_FAILED'; message: string };

/**
 * Log out the current user.
 *
 * Clears local auth state and invalidates server session.
 */
export async function logout(deps: { authService: AuthService }): Promise<Result<void, LogoutError>> {
	try {
		await deps.authService.logout();
		return ok(undefined);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown logout error';
		return err({ type: 'LOGOUT_FAILED', message });
	}
}

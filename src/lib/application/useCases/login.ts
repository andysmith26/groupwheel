/**
 * Login Use Case
 *
 * Initiates the OAuth login flow.
 *
 * @module application/useCases/login
 */

import type { AuthService } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

export type LoginError = { type: 'AUTH_SERVICE_UNAVAILABLE' } | { type: 'LOGIN_FAILED'; message: string };

/**
 * Initiate the OAuth login flow.
 *
 * This will redirect the user to the OAuth provider's login page.
 */
export async function login(deps: { authService: AuthService }): Promise<Result<void, LoginError>> {
	try {
		await deps.authService.login();
		return ok(undefined);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown login error';
		return err({ type: 'LOGIN_FAILED', message });
	}
}

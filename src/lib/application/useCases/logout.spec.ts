import { describe, it, expect, beforeEach } from 'vitest';
import { logout } from './logout';
import type { LogoutError } from './logout';
import { InMemoryAuthAdapter } from '$lib/infrastructure/auth/InMemoryAuthAdapter';
import type { AuthService } from '$lib/application/ports';

function expectErrType<T extends { type: string }, K extends T['type']>(
	result: { status: 'ok'; value: unknown } | { status: 'err'; error: T },
	expectedType: K
): Extract<T, { type: K }> {
	if (result.status !== 'err') {
		throw new Error(`Expected error result but received ${result.status}`);
	}
	if (result.error.type !== expectedType) {
		throw new Error(`Expected error type ${expectedType} but received ${result.error.type}`);
	}
	return result.error as Extract<T, { type: K }>;
}

describe('logout', () => {
	let authService: InMemoryAuthAdapter;

	beforeEach(() => {
		authService = new InMemoryAuthAdapter();
	});

	describe('success cases', () => {
		it('should return ok when logout succeeds', async () => {
			const result = await logout({ authService });

			expect(result.status).toBe('ok');
		});

		it('should clear user when logged out', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(authService.isAuthenticated()).toBe(true);

			await logout({ authService });

			expect(authService.isAuthenticated()).toBe(false);
		});

		it('should clear access token when logged out', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			await logout({ authService });

			expect(await authService.getAccessToken()).toBeNull();
		});

		it('should call authService.logout()', async () => {
			let logoutCalled = false;
			const trackingAuthService: AuthService = {
				...authService,
				logout: async () => {
					logoutCalled = true;
				}
			};

			await logout({ authService: trackingAuthService });

			expect(logoutCalled).toBe(true);
		});

		it('should succeed even when not authenticated', async () => {
			expect(authService.isAuthenticated()).toBe(false);

			const result = await logout({ authService });

			expect(result.status).toBe('ok');
		});
	});

	describe('error cases', () => {
		it('should return LOGOUT_FAILED when authService.logout() throws', async () => {
			const failingAuthService: AuthService = {
				...authService,
				logout: async () => {
					throw new Error('Server logout failed');
				}
			};

			const result = await logout({ authService: failingAuthService });

			const error = expectErrType<LogoutError, 'LOGOUT_FAILED'>(result, 'LOGOUT_FAILED');
			expect(error.message).toBe('Server logout failed');
		});

		it('should handle non-Error throws gracefully', async () => {
			const failingAuthService: AuthService = {
				...authService,
				logout: async () => {
					throw 'string error';
				}
			};

			const result = await logout({ authService: failingAuthService });

			const error = expectErrType<LogoutError, 'LOGOUT_FAILED'>(result, 'LOGOUT_FAILED');
			expect(error.message).toBe('Unknown logout error');
		});
	});
});

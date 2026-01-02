import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCurrentUser, isAuthenticated, onAuthStateChange } from './getCurrentUser';
import { InMemoryAuthAdapter } from '$lib/infrastructure/auth/InMemoryAuthAdapter';

describe('getCurrentUser', () => {
	let authService: InMemoryAuthAdapter;

	beforeEach(() => {
		authService = new InMemoryAuthAdapter();
	});

	describe('getCurrentUser', () => {
		it('should return null when no user is authenticated', async () => {
			const result = await getCurrentUser({ authService });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toBeNull();
			}
		});

		it('should return the authenticated user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			const result = await getCurrentUser({ authService });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toEqual(user);
			}
		});

		it('should return user with all properties', async () => {
			const user = InMemoryAuthAdapter.createTestUser({
				id: 'user-456',
				email: 'teacher@school.edu',
				name: 'Jane Teacher',
				avatarUrl: 'https://example.com/avatar.jpg'
			});
			await authService.setUser(user, 'test-token');

			const result = await getCurrentUser({ authService });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value?.id).toBe('user-456');
				expect(result.value?.email).toBe('teacher@school.edu');
				expect(result.value?.name).toBe('Jane Teacher');
				expect(result.value?.avatarUrl).toBe('https://example.com/avatar.jpg');
				expect(result.value?.provider).toBe('google');
			}
		});
	});

	describe('isAuthenticated', () => {
		it('should return false when no user is authenticated', () => {
			expect(isAuthenticated({ authService })).toBe(false);
		});

		it('should return true when user is authenticated', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(isAuthenticated({ authService })).toBe(true);
		});

		it('should return false after logout', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');
			await authService.logout();

			expect(isAuthenticated({ authService })).toBe(false);
		});
	});

	describe('onAuthStateChange', () => {
		it('should call callback immediately with current state (null)', () => {
			const callback = vi.fn();

			onAuthStateChange({ authService }, callback);

			expect(callback).toHaveBeenCalledWith(null);
		});

		it('should call callback immediately with authenticated user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			const callback = vi.fn();
			onAuthStateChange({ authService }, callback);

			expect(callback).toHaveBeenCalledWith(user);
		});

		it('should call callback when user logs in', async () => {
			const callback = vi.fn();
			onAuthStateChange({ authService }, callback);
			callback.mockClear();

			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(callback).toHaveBeenCalledWith(user);
		});

		it('should call callback when user logs out', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			const callback = vi.fn();
			onAuthStateChange({ authService }, callback);
			callback.mockClear();

			await authService.logout();

			expect(callback).toHaveBeenCalledWith(null);
		});

		it('should return unsubscribe function', async () => {
			const callback = vi.fn();
			const unsubscribe = onAuthStateChange({ authService }, callback);
			callback.mockClear();

			unsubscribe();

			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(callback).not.toHaveBeenCalled();
		});

		it('should support multiple subscribers', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			onAuthStateChange({ authService }, callback1);
			onAuthStateChange({ authService }, callback2);
			callback1.mockClear();
			callback2.mockClear();

			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(callback1).toHaveBeenCalledWith(user);
			expect(callback2).toHaveBeenCalledWith(user);
		});

		it('should only unsubscribe the specific callback', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const unsubscribe1 = onAuthStateChange({ authService }, callback1);
			onAuthStateChange({ authService }, callback2);
			callback1.mockClear();
			callback2.mockClear();

			unsubscribe1();

			const user = InMemoryAuthAdapter.createTestUser();
			await authService.setUser(user, 'test-token');

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledWith(user);
		});
	});
});

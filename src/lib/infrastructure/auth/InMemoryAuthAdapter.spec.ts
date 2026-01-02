import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryAuthAdapter } from './InMemoryAuthAdapter';
import type { AuthUser } from '$lib/application/ports';

describe('InMemoryAuthAdapter', () => {
	let adapter: InMemoryAuthAdapter;

	beforeEach(() => {
		adapter = new InMemoryAuthAdapter();
	});

	describe('initial state', () => {
		it('should start with no authenticated user', async () => {
			expect(await adapter.getUser()).toBeNull();
		});

		it('should start with no access token', async () => {
			expect(await adapter.getAccessToken()).toBeNull();
		});

		it('should report not authenticated', () => {
			expect(adapter.isAuthenticated()).toBe(false);
		});
	});

	describe('setUser', () => {
		it('should set the authenticated user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(await adapter.getUser()).toEqual(user);
		});

		it('should set the access token', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(await adapter.getAccessToken()).toBe('test-token');
		});

		it('should update isAuthenticated to true', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(adapter.isAuthenticated()).toBe(true);
		});

		it('should notify listeners when user is set', async () => {
			const listener = vi.fn();
			adapter.onAuthStateChange(listener);

			// Initial call happens immediately on subscribe
			expect(listener).toHaveBeenCalledWith(null);
			listener.mockClear();

			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(listener).toHaveBeenCalledWith(user);
		});
	});

	describe('logout', () => {
		it('should clear the authenticated user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');
			await adapter.logout();

			expect(await adapter.getUser()).toBeNull();
		});

		it('should clear the access token', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');
			await adapter.logout();

			expect(await adapter.getAccessToken()).toBeNull();
		});

		it('should update isAuthenticated to false', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');
			await adapter.logout();

			expect(adapter.isAuthenticated()).toBe(false);
		});

		it('should notify listeners when logged out', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			const listener = vi.fn();
			adapter.onAuthStateChange(listener);
			listener.mockClear();

			await adapter.logout();

			expect(listener).toHaveBeenCalledWith(null);
		});
	});

	describe('login', () => {
		it('should be a no-op (for testing purposes)', async () => {
			await adapter.login();

			// login() is a no-op - use setUser() to simulate login
			expect(await adapter.getUser()).toBeNull();
		});
	});

	describe('onAuthStateChange', () => {
		it('should call listener immediately with current state', () => {
			const listener = vi.fn();
			adapter.onAuthStateChange(listener);

			expect(listener).toHaveBeenCalledWith(null);
		});

		it('should call listener immediately with authenticated user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			const listener = vi.fn();
			adapter.onAuthStateChange(listener);

			expect(listener).toHaveBeenCalledWith(user);
		});

		it('should return unsubscribe function', async () => {
			const listener = vi.fn();
			const unsubscribe = adapter.onAuthStateChange(listener);
			listener.mockClear();

			unsubscribe();

			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should support multiple listeners', async () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();
			adapter.onAuthStateChange(listener1);
			adapter.onAuthStateChange(listener2);
			listener1.mockClear();
			listener2.mockClear();

			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(listener1).toHaveBeenCalledWith(user);
			expect(listener2).toHaveBeenCalledWith(user);
		});
	});

	describe('synchronous methods', () => {
		it('getUserSync should return current user', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(adapter.getUserSync()).toEqual(user);
		});

		it('getAccessTokenSync should return current token', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			expect(adapter.getAccessTokenSync()).toBe('test-token');
		});
	});

	describe('clearUser', () => {
		it('should clear user without notifying server', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			adapter.clearUser();

			expect(await adapter.getUser()).toBeNull();
			expect(await adapter.getAccessToken()).toBeNull();
		});

		it('should notify listeners when cleared', async () => {
			const user = InMemoryAuthAdapter.createTestUser();
			await adapter.setUser(user, 'test-token');

			const listener = vi.fn();
			adapter.onAuthStateChange(listener);
			listener.mockClear();

			adapter.clearUser();

			expect(listener).toHaveBeenCalledWith(null);
		});
	});

	describe('createTestUser', () => {
		it('should create a test user with default values', () => {
			const user = InMemoryAuthAdapter.createTestUser();

			expect(user.id).toBe('test-user-123');
			expect(user.email).toBe('test@example.com');
			expect(user.name).toBe('Test User');
			expect(user.provider).toBe('google');
		});

		it('should allow overriding default values', () => {
			const user = InMemoryAuthAdapter.createTestUser({
				id: 'custom-id',
				email: 'custom@example.com',
				name: 'Custom User'
			});

			expect(user.id).toBe('custom-id');
			expect(user.email).toBe('custom@example.com');
			expect(user.name).toBe('Custom User');
			expect(user.provider).toBe('google');
		});

		it('should allow adding optional avatarUrl', () => {
			const user = InMemoryAuthAdapter.createTestUser({
				avatarUrl: 'https://example.com/avatar.jpg'
			});

			expect(user.avatarUrl).toBe('https://example.com/avatar.jpg');
		});
	});
});

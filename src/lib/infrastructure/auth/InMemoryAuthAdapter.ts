/**
 * In-memory auth adapter implementing AuthService.
 *
 * Used for testing. Allows programmatic control of auth state.
 *
 * @module infrastructure/auth/InMemoryAuthAdapter
 */

import type { AuthService, AuthUser } from '$lib/application/ports';

export class InMemoryAuthAdapter implements AuthService {
	private currentUser: AuthUser | null = null;
	private currentToken: string | null = null;
	private listeners: Set<(user: AuthUser | null) => void> = new Set();

	/**
	 * Initiate login - in testing, this is a no-op.
	 * Use setUser() to simulate successful login.
	 */
	async login(): Promise<void> {
		// No-op in testing - use setUser() to simulate login
	}

	/**
	 * Log out the current user.
	 */
	async logout(): Promise<void> {
		this.currentUser = null;
		this.currentToken = null;
		this.notifyListeners();
	}

	/**
	 * Get the currently authenticated user.
	 */
	async getUser(): Promise<AuthUser | null> {
		return this.currentUser;
	}

	/**
	 * Get the current access token.
	 */
	async getAccessToken(): Promise<string | null> {
		return this.currentToken;
	}

	/**
	 * Get the current access token synchronously.
	 */
	getAccessTokenSync(): string | null {
		return this.currentToken;
	}

	/**
	 * Get the current user synchronously.
	 */
	getUserSync(): AuthUser | null {
		return this.currentUser;
	}

	/**
	 * Subscribe to authentication state changes.
	 */
	onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
		this.listeners.add(callback);
		callback(this.currentUser);
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Check if the user is currently authenticated.
	 */
	isAuthenticated(): boolean {
		return this.currentUser !== null;
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.currentUser);
		}
	}

	// Test helpers

	/**
	 * Simulate a successful login.
	 */
	setUser(user: AuthUser, accessToken: string): void {
		this.currentUser = user;
		this.currentToken = accessToken;
		this.notifyListeners();
	}

	/**
	 * Clear auth state (simulate logout without calling the server).
	 */
	clearUser(): void {
		this.currentUser = null;
		this.currentToken = null;
		this.notifyListeners();
	}

	/**
	 * Create a test user for convenience.
	 */
	static createTestUser(overrides?: Partial<AuthUser>): AuthUser {
		return {
			id: 'test-user-123',
			email: 'test@example.com',
			name: 'Test User',
			provider: 'google',
			...overrides
		};
	}
}

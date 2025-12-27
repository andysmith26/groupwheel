/**
 * Authentication service port.
 *
 * Defines how the application layer interacts with authentication.
 * Implemented by OAuth adapters in the infrastructure layer.
 *
 * @module application/ports/AuthService
 */

/**
 * Represents an authenticated user.
 */
export interface AuthUser {
	/**
	 * Unique identifier from the OAuth provider.
	 */
	id: string;

	/**
	 * User's email address.
	 */
	email: string;

	/**
	 * User's display name.
	 */
	name: string;

	/**
	 * URL to user's profile picture (if available).
	 */
	avatarUrl?: string;

	/**
	 * Which OAuth provider authenticated this user.
	 */
	provider: 'google';
}

/**
 * Authentication service interface.
 *
 * Provides methods for OAuth login/logout and user state management.
 * Anonymous usage (null user) is the default state.
 */
export interface AuthService {
	/**
	 * Initiate OAuth login flow.
	 * Redirects the user to the OAuth provider's login page.
	 */
	login(): Promise<void>;

	/**
	 * Log out the current user.
	 * Clears authentication state and tokens.
	 */
	logout(): Promise<void>;

	/**
	 * Get the currently authenticated user, or null if anonymous.
	 */
	getUser(): Promise<AuthUser | null>;

	/**
	 * Get the current access token for API calls.
	 * Returns null if not authenticated.
	 */
	getAccessToken(): Promise<string | null>;

	/**
	 * Subscribe to authentication state changes.
	 * @param callback Called when auth state changes (login/logout)
	 * @returns Unsubscribe function
	 */
	onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;

	/**
	 * Check if the user is currently authenticated.
	 */
	isAuthenticated(): boolean;
}

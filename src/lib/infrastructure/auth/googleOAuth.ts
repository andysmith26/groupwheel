/**
 * Google OAuth adapter.
 *
 * Implements the AuthService port for Google OAuth authentication.
 * Uses SvelteKit server-side endpoints for the OAuth flow.
 *
 * @module infrastructure/auth/googleOAuth
 */

import type { AuthService, AuthUser, StoragePort, HttpClientPort } from '$lib/application/ports';

const AUTH_USER_KEY = 'groupwheel_auth_user';
const AUTH_TOKEN_KEY = 'groupwheel_auth_token';
const OAUTH_STATE_KEY = 'oauth_state';

export interface GoogleOAuthAdapterDeps {
	/** Storage for persisting auth state (localStorage) */
	storage: StoragePort;
	/** Session storage for OAuth state (sessionStorage) */
	sessionStorage: StoragePort;
	/** Navigation function for redirects */
	navigate: (url: string) => Promise<void>;
	/** Function to get current origin for redirect URI */
	getOrigin: () => string;
	/** Google OAuth client ID */
	clientId?: string;
	/** HTTP client for API calls (optional) */
	httpClient?: HttpClientPort;
}

/**
 * Google OAuth adapter implementing AuthService.
 */
export class GoogleOAuthAdapter implements AuthService {
	private listeners: Set<(user: AuthUser | null) => void> = new Set();
	private currentUser: AuthUser | null = null;
	private currentToken: string | null = null;
	private initialized = false;

	private readonly storage: StoragePort;
	private readonly sessionStorage: StoragePort;
	private readonly navigate: (url: string) => Promise<void>;
	private readonly getOrigin: () => string;
	private readonly clientId?: string;
	private readonly httpClient?: HttpClientPort;

	constructor(deps: GoogleOAuthAdapterDeps) {
		this.storage = deps.storage;
		this.sessionStorage = deps.sessionStorage;
		this.navigate = deps.navigate;
		this.getOrigin = deps.getOrigin;
		this.clientId = deps.clientId;
		this.httpClient = deps.httpClient;
	}

	/**
	 * Initialize the adapter by loading persisted auth state.
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			const userJson = await this.storage.get(AUTH_USER_KEY);
			const token = await this.storage.get(AUTH_TOKEN_KEY);

			if (userJson && token) {
				this.currentUser = JSON.parse(userJson);
				this.currentToken = token;
			}
		} catch {
			// Ignore parse errors, start with null user
		}

		this.initialized = true;
		// Notify listeners of the loaded auth state
		this.notifyListeners();
	}

	/**
	 * Set the authenticated user (called after OAuth callback).
	 */
	async setUser(user: AuthUser, accessToken: string): Promise<void> {
		this.currentUser = user;
		this.currentToken = accessToken;

		await this.storage.set(AUTH_USER_KEY, JSON.stringify(user));
		await this.storage.set(AUTH_TOKEN_KEY, accessToken);

		this.notifyListeners();
	}

	/**
	 * Clear the authenticated user.
	 */
	async clearUser(): Promise<void> {
		this.currentUser = null;
		this.currentToken = null;

		await this.storage.remove(AUTH_USER_KEY);
		await this.storage.remove(AUTH_TOKEN_KEY);

		this.notifyListeners();
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.currentUser);
		}
	}

	/**
	 * Initiate Google OAuth login flow.
	 * Builds the OAuth URL and redirects to Google.
	 */
	async login(): Promise<void> {
		// If already authenticated, nothing to do
		if (this.isAuthenticated()) {
			await this.navigate('/');
			return;
		}

		// Check if OAuth is configured
		if (!this.clientId) {
			// Redirect to login page to show error
			await this.navigate('/auth/login?error=not_configured');
			return;
		}

		// Build Google OAuth URL
		const origin = this.getOrigin();
		const redirectUri = `${origin}/auth/callback`;
		const scope = 'openid email profile';
		const responseType = 'code';
		const state = crypto.randomUUID(); // CSRF protection

		// Store state for validation in callback
		await this.sessionStorage.set(OAUTH_STATE_KEY, state);

		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: redirectUri,
			response_type: responseType,
			scope: scope,
			state: state,
			access_type: 'offline',
			prompt: 'consent'
		});

		const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

		// Redirect to Google
		await this.navigate(googleAuthUrl);
	}

	/**
	 * Get the stored OAuth state for callback validation.
	 */
	async getOAuthState(): Promise<string | null> {
		return this.sessionStorage.get(OAUTH_STATE_KEY);
	}

	/**
	 * Clear the stored OAuth state after validation.
	 */
	async clearOAuthState(): Promise<void> {
		await this.sessionStorage.remove(OAUTH_STATE_KEY);
	}

	/**
	 * Log out the current user.
	 */
	async logout(): Promise<void> {
		// Call the logout endpoint to clear server-side session
		try {
			if (this.httpClient) {
				await this.httpClient.request({ url: '/auth/logout', method: 'POST' });
			} else {
				await fetch('/auth/logout', { method: 'POST' });
			}
		} catch {
			// Ignore network errors, still clear client state
		}

		await this.clearUser();
	}

	/**
	 * Get the currently authenticated user.
	 */
	async getUser(): Promise<AuthUser | null> {
		return this.currentUser;
	}

	/**
	 * Get the current access token for API calls.
	 */
	async getAccessToken(): Promise<string | null> {
		return this.currentToken;
	}

	/**
	 * Get the current access token synchronously.
	 * Used by SyncManager for auth header.
	 */
	getAccessTokenSync(): string | null {
		return this.currentToken;
	}

	/**
	 * Get the current user synchronously.
	 * Used for reactive UI updates.
	 */
	getUserSync(): AuthUser | null {
		return this.currentUser;
	}

	/**
	 * Subscribe to authentication state changes.
	 */
	onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
		this.listeners.add(callback);
		// Immediately call with current state
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

	/**
	 * Clean up resources.
	 */
	dispose(): void {
		this.listeners.clear();
	}
}

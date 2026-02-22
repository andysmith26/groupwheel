import { describe, it, expect, beforeEach } from 'vitest';
import { login } from './login';
import type { LoginError } from './login';
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

describe('login', () => {
  let authService: InMemoryAuthAdapter;

  beforeEach(() => {
    authService = new InMemoryAuthAdapter();
  });

  /** Create a mock AuthService that delegates to the real adapter with optional overrides. */
  function mockAuthService(overrides: Partial<AuthService> = {}): AuthService {
    return {
      login: authService.login.bind(authService),
      logout: authService.logout.bind(authService),
      setUser: authService.setUser.bind(authService),
      getUser: authService.getUser.bind(authService),
      getAccessToken: authService.getAccessToken.bind(authService),
      onAuthStateChange: authService.onAuthStateChange.bind(authService),
      isAuthenticated: authService.isAuthenticated.bind(authService),
      ...overrides
    };
  }

  describe('success cases', () => {
    it('should return ok when login succeeds', async () => {
      const result = await login({ authService });

      expect(result.status).toBe('ok');
    });

    it('should call authService.login()', async () => {
      let loginCalled = false;
      const trackingAuthService = mockAuthService({
        login: async () => {
          loginCalled = true;
        }
      });

      await login({ authService: trackingAuthService });

      expect(loginCalled).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should return LOGIN_FAILED when authService.login() throws', async () => {
      const failingAuthService = mockAuthService({
        login: async () => {
          throw new Error('OAuth configuration error');
        }
      });

      const result = await login({ authService: failingAuthService });

      const error = expectErrType<LoginError, 'LOGIN_FAILED'>(result, 'LOGIN_FAILED');
      expect(error.message).toBe('OAuth configuration error');
    });

    it('should handle non-Error throws gracefully', async () => {
      const failingAuthService = mockAuthService({
        login: async () => {
          throw 'string error';
        }
      });

      const result = await login({ authService: failingAuthService });

      const error = expectErrType<LoginError, 'LOGIN_FAILED'>(result, 'LOGIN_FAILED');
      expect(error.message).toBe('Unknown login error');
    });
  });
});

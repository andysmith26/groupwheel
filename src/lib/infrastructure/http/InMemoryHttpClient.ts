/**
 * In-Memory HTTP Client
 *
 * Implements HttpClientPort for testing.
 * Allows setting mock responses.
 *
 * @module infrastructure/http/InMemoryHttpClient
 */

import type { HttpClientPort, HttpRequest, HttpResponse } from '$lib/application/ports/HttpClientPort';

export interface MockResponse<T = unknown> {
	status: number;
	ok: boolean;
	data: T;
}

export class InMemoryHttpClient implements HttpClientPort {
	private responses: Map<string, MockResponse> = new Map();
	private requestLog: HttpRequest[] = [];

	/**
	 * Set a mock response for a URL pattern.
	 */
	setResponse<T>(urlPattern: string, response: MockResponse<T>): void {
		this.responses.set(urlPattern, response);
	}

	/**
	 * Get the request log for assertions.
	 */
	getRequestLog(): HttpRequest[] {
		return [...this.requestLog];
	}

	/**
	 * Clear all mocks and request log.
	 */
	clear(): void {
		this.responses.clear();
		this.requestLog = [];
	}

	async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
		this.requestLog.push(req);

		// Find matching mock response
		for (const [pattern, response] of this.responses) {
			if (req.url.includes(pattern)) {
				return response as HttpResponse<T>;
			}
		}

		// Default: return 404
		return {
			status: 404,
			ok: false,
			data: { error: 'Not found' } as unknown as T
		};
	}
}

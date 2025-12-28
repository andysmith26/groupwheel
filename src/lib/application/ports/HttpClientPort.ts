/**
 * HTTP Client Port
 *
 * Abstracts HTTP requests for infrastructure adapters.
 * Allows swapping implementations for testing or different environments.
 *
 * @module application/ports/HttpClientPort
 */

export interface HttpRequest {
	url: string;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	headers?: Record<string, string>;
	body?: unknown;
}

export interface HttpResponse<T = unknown> {
	status: number;
	ok: boolean;
	data: T;
}

/**
 * Port for making HTTP requests.
 */
export interface HttpClientPort {
	/**
	 * Make an HTTP request.
	 */
	request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

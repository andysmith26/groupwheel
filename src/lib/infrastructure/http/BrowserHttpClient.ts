/**
 * Browser HTTP Client
 *
 * Implements HttpClientPort using the browser's fetch API.
 *
 * @module infrastructure/http/BrowserHttpClient
 */

import type { HttpClientPort, HttpRequest, HttpResponse } from '$lib/application/ports/HttpClientPort';

export class BrowserHttpClient implements HttpClientPort {
	async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
		const init: RequestInit = {
			method: req.method ?? 'GET',
			headers: req.headers
		};

		if (req.body !== undefined) {
			init.body = JSON.stringify(req.body);
			init.headers = {
				'Content-Type': 'application/json',
				...init.headers
			};
		}

		const response = await fetch(req.url, init);

		let data: T;
		const contentType = response.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			data = await response.json();
		} else {
			data = (await response.text()) as unknown as T;
		}

		return {
			status: response.status,
			ok: response.ok,
			data
		};
	}
}

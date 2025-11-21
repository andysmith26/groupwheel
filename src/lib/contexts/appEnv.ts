import { getContext, setContext } from 'svelte';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

const APP_ENV_CONTEXT_KEY = Symbol('app-env-context');

export function setAppEnvContext(env: InMemoryEnvironment): void {
	setContext(APP_ENV_CONTEXT_KEY, env);
}

export function getAppEnvContext(): InMemoryEnvironment {
	const env = getContext<InMemoryEnvironment | undefined>(APP_ENV_CONTEXT_KEY);
	if (!env) {
		throw new Error('App environment context has not been set. Did you forget to wrap in +layout.svelte?');
	}
	return env;
}
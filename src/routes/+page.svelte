<script lang="ts">
	/**
	 * Landing page for Groupwheel.
	 *
	 * - First-time visitors: See value proposition + CTA to create groups
	 * - Returning users (have activities in IndexedDB): Auto-redirect to /activities
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { listActivities } from '$lib/services/appEnvUseCases';
	import { isOk } from '$lib/types/result';
	import logo from '$lib/assets/logo.svg';

	let checking = $state(true);

	onMount(async () => {
		const env = getAppEnvContext();
		const result = await listActivities(env);

		if (isOk(result) && result.value.length > 0) {
			// Returning user — redirect to dashboard
			goto('/activities', { replaceState: true });
			return;
		}

		// First-time visitor — show landing page
		checking = false;
	});
</script>

<svelte:head>
	<title>Groupwheel — Student grouping made simple</title>
</svelte:head>

{#if checking}
	<!-- Brief loading state while checking for existing activities -->
	<div class="flex min-h-[60vh] items-center justify-center">
		<p class="text-gray-500">Loading...</p>
	</div>
{:else}
	<div class="mx-auto max-w-3xl px-4 py-12">
		<!-- Hero -->
		<section class="text-center">
			<img src={logo} alt="Groupwheel" class="mx-auto mb-6 h-24 w-24" />
			<h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
				Stop wrestling with spreadsheets to make student groups.
			</h1>
			<p class="mt-4 text-lg text-gray-600">
				Groupwheel helps teachers create balanced groups in minutes—not hours. Paste your roster,
				collect student requests, and let the algorithm do the math.
			</p>
			<div class="mt-8">
				<a
					href="/activities/new"
					class="inline-block rounded-lg bg-coral px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-coral-dark focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:outline-none"
				>
					Get Started — it's free
				</a>
			</div>
		</section>

		<!-- Value props -->
		<section class="mt-16 grid gap-8 sm:grid-cols-2">
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral/10">
					<svg class="h-5 w-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
						/>
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900">Give students a voice</h3>
				<p class="mt-2 text-sm text-gray-600">
					Students rank which groups they want to join. The algorithm optimizes so more kids get
					what they asked for.
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
					<svg class="h-5 w-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 9l4-4 4 4m0 6l-4 4-4-4"
						/>
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900">Fine-tune with drag-and-drop</h3>
				<p class="mt-2 text-sm text-gray-600">
					The algorithm is a starting point. Move students between groups, undo mistakes, and adjust
					until it's right.
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber/10">
					<svg class="h-5 w-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900">See the results before you commit</h3>
				<p class="mt-2 text-sm text-gray-600">
					Instant analytics show what percentage got their top choice. You stay in control.
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
					<svg class="h-5 w-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900">Privacy-first</h3>
				<p class="mt-2 text-sm text-gray-600">
					All data stays in your browser. No accounts, no servers storing student info, no
					compliance headaches.
				</p>
			</div>
		</section>

		<!-- Secondary CTA for returning users who cleared storage -->
		<section class="mt-12 text-center">
			<p class="text-sm text-gray-500">
				Already have activities?
				<a href="/activities" class="font-medium text-teal hover:text-teal-dark hover:underline">
					Go to your dashboard →
				</a>
			</p>
		</section>
	</div>
{/if}

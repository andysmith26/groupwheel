<script lang="ts">
	import '../app.css';

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	if (browser) {
		// This runs during component initialization on the client,
		// before child components execute their <script> blocks.
		const env = createInMemoryEnvironment();
		setAppEnvContext(env);
	}

	const navSections = [
		{
			title: 'Ready to use',
			description: 'Current tools you can use in the workspace.',
			items: [
				{ href: '/pools', label: 'Pools' },
				{ href: '/pools/import', label: 'Import Roster' },
				{ href: '/programs', label: 'Programs' },
				{ href: '/programs/new', label: 'Create Program' }
			]
		},
		{
			title: 'Building now',
			description: 'Upcoming workflows we are actively developing.',
			items: [
				{ href: '/analytics', label: 'Analytics Hub' },
				{ href: '/active-grouping', label: 'Active Grouping' },
				{ href: '/conflicts', label: 'Conflict Rules' },
				{ href: '/sis-sync', label: 'SIS Sync' },
				{ href: '/collaboration', label: 'Collaboration' }
			]
		},
		{
			title: 'On the horizon',
			description: 'Ideas we are scoping for future releases.',
			items: [
				{ href: '/observations', label: 'Observations & Surveys' },
				{ href: '/student-portal', label: 'Student Portal' }
			]
		}
	];

	function isActiveLink(pathname: string, href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	function linkClasses(active: boolean) {
		const base =
			'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium shadow-sm transition';
		if (active) {
			return `${base} border-blue-200 bg-blue-100 text-blue-900`;
		}
		return `${base} border-blue-100 bg-blue-50 text-blue-800 hover:border-blue-200 hover:bg-blue-100`;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white shadow-sm">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
		>
			<div>
				<p class="text-xs tracking-wide text-gray-500 uppercase">Friend Hat</p>
				<h1 class="text-lg font-semibold">Teacher workspace</h1>
			</div>
			<nav aria-label="Site sections" class="grid gap-3 text-sm md:grid-cols-3">
				{#each navSections as section}
					<section class="space-y-2 rounded-xl border border-gray-200 bg-white/70 p-3 shadow-sm">
						<header class="space-y-1">
							<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
								{section.title}
							</p>
							<p class="text-xs text-gray-600">{section.description}</p>
						</header>
						<ul class="flex flex-wrap gap-2" aria-label={`${section.title} links`}>
							{#each section.items as item}
								{#key item.href}
									<li>
										<a
											class={linkClasses(isActiveLink($page.url.pathname, item.href))}
											href={item.href}
											aria-current={isActiveLink($page.url.pathname, item.href)
												? 'page'
												: undefined}
										>
											{item.label}
										</a>
									</li>
								{/key}
							{/each}
						</ul>
					</section>
				{/each}
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-6xl p-4">
		<slot />
	</main>
</div>

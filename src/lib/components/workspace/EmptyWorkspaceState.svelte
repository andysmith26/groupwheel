<script lang="ts">
	const {
		studentCount = 0,
		preferencesCount = 0
	} = $props<{
		studentCount?: number;
		preferencesCount?: number;
	}>();
</script>

<div class="flex flex-col items-center justify-center py-16">
	<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
		<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
			<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		</div>
		<h3 class="text-lg font-medium text-gray-900">No groups yet</h3>
		<p class="mt-1 text-sm text-gray-500">
			{studentCount} students · {preferencesCount} with preferences
		</p>
		<p class="mt-3 text-sm text-gray-600">
			Groups should have been auto-generated. Try refreshing the page.
		</p>
	</div>
</div>

<script lang="ts">
	const {
		isOpen = false,
		programName = '',
		onPublish,
		onCancel,
		isPublishing = false,
		error = null
	} = $props<{
		isOpen?: boolean;
		programName?: string;
		onPublish?: (data: {
			sessionName: string;
			academicYear: string;
			startDate: Date;
			endDate: Date;
		}) => void;
		onCancel?: () => void;
		isPublishing?: boolean;
		error?: string | null;
	}>();

	// Helper to get current academic year (e.g., "2024-2025")
	function getCurrentAcademicYear(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		// Academic year starts in August/September
		if (month >= 7) {
			return `${year}-${year + 1}`;
		}
		return `${year - 1}-${year}`;
	}

	// Helper to format date for input
	function formatDateForInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	// Default end date is 6 weeks from start
	function getDefaultEndDate(start: Date): Date {
		const end = new Date(start);
		end.setDate(end.getDate() + 42); // 6 weeks
		return end;
	}

	// Form state
	let sessionName = $state(programName || 'Session');
	let academicYear = $state(getCurrentAcademicYear());
	let startDate = $state(new Date());
	let endDate = $state(getDefaultEndDate(new Date()));

	// Reset form when modal opens
	$effect(() => {
		if (isOpen) {
			sessionName = programName || 'Session';
			academicYear = getCurrentAcademicYear();
			startDate = new Date();
			endDate = getDefaultEndDate(new Date());
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		onPublish?.({
			sessionName,
			academicYear,
			startDate,
			endDate
		});
	}

	function handleStartDateChange(e: Event) {
		const target = e.target as HTMLInputElement;
		startDate = new Date(target.value);
		// Auto-adjust end date if it's before start
		if (endDate < startDate) {
			endDate = getDefaultEndDate(startDate);
		}
	}

	function handleEndDateChange(e: Event) {
		const target = e.target as HTMLInputElement;
		endDate = new Date(target.value);
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50"
		onclick={onCancel}
		aria-label="Close modal"
	></button>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Publish Groups</h2>

			<p class="mb-4 text-sm text-gray-600">
				Publishing creates a permanent record of these group assignments. You can track which
				preference choice each student received.
			</p>

			{#if error}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit}>
				<div class="space-y-4">
					<div>
						<label for="sessionName" class="block text-sm font-medium text-gray-700">
							Session Name
						</label>
						<input
							id="sessionName"
							type="text"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
							bind:value={sessionName}
							placeholder="e.g., Fall Clubs - Session 1"
							required
						/>
					</div>

					<div>
						<label for="academicYear" class="block text-sm font-medium text-gray-700">
							Academic Year
						</label>
						<input
							id="academicYear"
							type="text"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
							bind:value={academicYear}
							placeholder="e.g., 2024-2025"
							required
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="startDate" class="block text-sm font-medium text-gray-700">
								Start Date
							</label>
							<input
								id="startDate"
								type="date"
								class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
								value={formatDateForInput(startDate)}
								onchange={handleStartDateChange}
								required
							/>
						</div>

						<div>
							<label for="endDate" class="block text-sm font-medium text-gray-700">
								End Date
							</label>
							<input
								id="endDate"
								type="date"
								class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
								value={formatDateForInput(endDate)}
								onchange={handleEndDateChange}
								min={formatDateForInput(startDate)}
								required
							/>
						</div>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onCancel}
						disabled={isPublishing}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
						disabled={isPublishing || !sessionName.trim()}
					>
						{#if isPublishing}
							<span class="inline-flex items-center gap-2">
								<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Publishing...
							</span>
						{:else}
							Publish
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

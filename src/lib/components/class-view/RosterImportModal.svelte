<script lang="ts">
	/**
	 * RosterImportModal — Paste-based roster import for the Class View.
	 *
	 * Supports pasting a list of student names (one per line, or CSV/TSV).
	 * Reuses parseRosterFromPaste for parsing and addStudentToPool for persistence.
	 *
	 * See: project definition.md — WP4, Part 3 (Class View roster panel)
	 */

	import { fade, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui';

	interface Props {
		open: boolean;
		onClose: () => void;
		onImport: (pastedText: string) => Promise<void>;
	}

	let { open, onClose, onImport }: Props = $props();

	let pasteText = $state('');
	let importing = $state(false);
	let error = $state<string | null>(null);

	let lineCount = $derived(
		pasteText
			.split(/\r?\n/)
			.filter((line) => line.trim().length > 0).length
	);

	async function handleImport() {
		if (!pasteText.trim()) {
			error = 'Paste your student names first';
			return;
		}

		importing = true;
		error = null;

		try {
			await onImport(pasteText);
			pasteText = '';
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Import failed';
		} finally {
			importing = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		transition:fade={{ duration: 150 }}
		role="dialog"
		aria-modal="true"
		aria-label="Import roster"
		onkeydown={handleKeydown}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			transition:scale={{ duration: 150, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="text-lg font-medium text-gray-900">Import Roster</h3>
			<p class="mt-1 text-sm text-gray-500">
				Paste student names, one per line. Supports "First Last" or "Last, First" format.
			</p>

			<div class="mt-4">
				<textarea
					bind:value={pasteText}
					class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
					rows="8"
					placeholder={"Alex Johnson\nJamie Smith\nRiley Chen\n..."}
				></textarea>

				{#if lineCount > 0}
					<p class="mt-1 text-xs text-gray-500">
						{lineCount} {lineCount === 1 ? 'student' : 'students'} detected
					</p>
				{/if}

				{#if error}
					<p class="mt-2 text-sm text-red-600">{error}</p>
				{/if}
			</div>

			<div class="mt-4 flex justify-end gap-3">
				<Button variant="ghost" onclick={onClose} disabled={importing}>
					Cancel
				</Button>
				<Button
					variant="secondary"
					onclick={handleImport}
					disabled={importing || !pasteText.trim()}
					loading={importing}
				>
					{importing ? 'Importing...' : 'Import'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
        import { goto } from '$app/navigation';
        import { onMount } from 'svelte';

        onMount(() => {
                goto('/programs/import');
        });
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div class="space-y-3 text-center">
                <h1 class="text-2xl font-semibold">Roster import has moved</h1>
                <p class="text-sm text-gray-600">
                        Redirecting to the new roster import flow. If you are not redirected automatically, use the link below.
                </p>
                <a class="text-sm font-medium text-blue-600 underline" href="/programs/import">
                        Go to roster import
                </a>
        </div>
</div>

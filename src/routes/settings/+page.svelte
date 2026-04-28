<script lang="ts">
  import DataBackupSettings from '$lib/components/settings/DataBackupSettings.svelte';
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

  <section class="mb-8">
    <DataBackupSettings />
  </section>
</div>

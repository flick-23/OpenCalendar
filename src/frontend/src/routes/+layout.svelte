<script lang="ts">
	import './app.css'; // Import global styles (Tailwind)
	import { navigating } from '$app/stores';
	import { isLoggedIn, logout } from '$lib/stores/authStore';
	import { applyTheme } from '$lib/stores/settingsStore';
	import { onMount } from 'svelte';

	// Optional: Loading indicator during navigation
	// $: isLoading = $navigating;

	// Example: Simple header with a logout button
	const handleLogout = async () => {
		await logout();
		// The +layout.ts load function should handle redirecting to /login
	};

	// Apply theme on mount
	onMount(() => {
		applyTheme();
	});

	// This is mostly for structure. Specific nav bars, sidebars etc. would go here or be imported.
</script>

<div
	class="min-h-screen bg-white"
	style="font-family: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;"
>
	<main class="h-full">
		{#if $navigating}
			<div class="text-center p-8 text-[#111418]">
				<div
					class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c7ff2] mx-auto mb-4"
				></div>
				<p class="font-medium">Loading...</p>
			</div>
		{:else}
			<slot /> <!-- Page content will be injected here -->
		{/if}
	</main>
</div>

<style lang="postcss">
	/* Scoped styles or additional global overrides if necessary */
</style>

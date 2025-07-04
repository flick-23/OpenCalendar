<script lang="ts">
	import './app.css'; // Import global styles (Tailwind)
	import { navigating } from '$app/stores';
	import { isLoggedIn, logout } from '$lib/stores/authStore';
	import { onMount } from 'svelte';

	// Optional: Loading indicator during navigation
	// $: isLoading = $navigating;

	// Example: Simple header with a logout button
	const handleLogout = async () => {
		await logout();
		// The +layout.ts load function should handle redirecting to /login
	};

	// This is mostly for structure. Specific nav bars, sidebars etc. would go here or be imported.
</script>

<div class="min-h-screen bg-gray-100">
	{#if $isLoggedIn}
		<header class="bg-blue-600 text-white p-4 shadow-md">
			<div class="container mx-auto flex justify-between items-center">
				<a href="/" class="text-xl font-bold">ICP Calendar</a>
				<nav>
					<!-- Navigation links can go here -->
					<!-- e.g., <a href="/calendar" class="px-3">Calendar</a> -->
					<button
						on:click={handleLogout}
						class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
					>
						Logout
					</button>
				</nav>
			</div>
		</header>
	{/if}

	<main class="container mx-auto p-4">
		{#if $navigating}
			<div class="text-center p-8">
				<p>Loading...</p>
				<!-- Basic loading state -->
			</div>
		{:else}
			<slot /> <!-- Page content will be injected here -->
		{/if}
	</main>

	{#if $isLoggedIn}
		<footer class="text-center p-4 mt-8 text-gray-600 text-sm">
			ICP Calendar App &copy; {new Date().getFullYear()}
		</footer>
	{/if}
</div>

<style lang="postcss">
	/* Scoped styles or additional global overrides if necessary */
</style>

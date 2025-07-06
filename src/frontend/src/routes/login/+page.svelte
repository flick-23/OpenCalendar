<script lang="ts">
	import { login, isLoggedIn } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores'; // To access URL parameters

	let isLoading = false;
	let errorMessage: string | null = null;

	// Reactive statement to handle redirect when login status changes
	$: if ($isLoggedIn) {
		console.log('User is logged in, redirecting...');
		isLoading = false; // Reset loading state
		const redirectParam = $page.url.searchParams.get('redirect');
		const destination = redirectParam ? decodeURIComponent(redirectParam) : '/';
		goto(destination, { replaceState: true });
	}

	onMount(() => {
		// Redirect to home page since login is now handled there
		const redirectParam = $page.url.searchParams.get('redirect');
		const destination = redirectParam ? `/?redirect=${encodeURIComponent(redirectParam)}` : '/';
		goto(destination, { replaceState: true });
	});

	const handleLogin = async () => {
		isLoading = true;
		errorMessage = null;
		try {
			console.log('Starting login process...');
			await login(); // This will redirect to Internet Identity
			// Note: The redirect handling is done in the reactive statement above
			console.log('Login process completed');
		} catch (error) {
			console.error('Login attempt failed:', error);
			errorMessage =
				'Login failed. Please try again. Ensure your Internet Identity is set up and pop-ups are allowed.';
			isLoading = false;
		}
	};
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-200">
	<div class="p-8 bg-white shadow-xl rounded-lg max-w-md w-full">
		<div class="text-center mb-6">
			<img src="/OpenCalendar.png" alt="OpenCalendar Logo" class="h-16 w-16 mx-auto mb-4" />
			<h1 class="text-3xl font-bold text-blue-600">OpenCalendar Login</h1>
		</div>

		{#if errorMessage}
			<div
				class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
				role="alert"
			>
				<strong class="font-bold">Error:</strong>
				<span class="block sm:inline">{errorMessage}</span>
			</div>
		{/if}

		<p class="text-gray-700 mb-6 text-center">
			Please log in using your Internet Identity to access the calendar.
		</p>

		<button
			on:click={handleLogin}
			disabled={isLoading || $isLoggedIn}
			class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
		>
			{#if isLoading}
				<span>Logging in...</span>
			{:else if $isLoggedIn}
				<span>Already Logged In</span>
			{:else}
				Log In with Internet Identity
			{/if}
		</button>

		{#if !$isLoggedIn && !isLoading}
			<p class="text-xs text-gray-600 mt-4 text-center">
				You will be redirected to the Internet Identity service.
			</p>
		{/if}
	</div>
</div>

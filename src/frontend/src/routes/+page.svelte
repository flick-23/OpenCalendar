<script lang="ts">
	import CalendarComponent from '$lib/components/Calendar.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import {
		isLoggedIn,
		userProfile,
		identity as authIdentity,
		fetchUserProfile
	} from '$lib/stores/authStore';
	import { getUserRegistryActor } from '$lib/actors/actors';
	import { onMount, onDestroy } from 'svelte';

	let showRegistration = false;
	let registrationName = '';
	let registrationLoading = false;
	let registrationError = '';

	$: if ($isLoggedIn && $userProfile === null && !$authIdentity.getPrincipal().isAnonymous()) {
		showRegistration = true;
	} else {
		showRegistration = false;
	}

	const handleRegistration = async () => {
		if (!registrationName.trim()) {
			registrationError = 'Please enter your name.';
			return;
		}
		registrationLoading = true;
		registrationError = '';
		try {
			const currentIdentity = $authIdentity;
			if (!currentIdentity) throw new Error('Identity not available.');
			const userRegistryActor = await getUserRegistryActor(currentIdentity);
			await userRegistryActor.register(registrationName);
			await fetchUserProfile(); // Refresh profile
			showRegistration = false;
		} catch (error: any) {
			console.error('Registration failed:', error);
			registrationError = error.message?.includes('User already registered')
				? 'Already registered. Refreshing...'
				: 'Registration failed.';
			if (registrationError.includes('Refreshing')) await fetchUserProfile();
		} finally {
			registrationLoading = false;
		}
	};

	onMount(async () => {
		// Simple onMount - new events system doesn't need calendar selection
	});

	onDestroy(() => {
		// No cleanup needed for simplified system
	});
</script>

<svelte:head>
	<title>OpenCalendar</title>
	<meta name="description" content="A simple calendar application" />
</svelte:head>

<div class="container mx-auto p-4 min-h-screen">
	{#if showRegistration}
		<div class="registration-form bg-white p-8 rounded-lg shadow-md max-w-md mx-auto my-10">
			<h2 class="text-xl font-semibold text-center mb-6">Welcome! Please Register</h2>
			{#if registrationError}<p class="text-red-500 text-sm mb-4">{registrationError}</p>{/if}
			<input
				type="text"
				bind:value={registrationName}
				placeholder="Your Name"
				class="w-full px-3 py-2 border rounded mb-4"
				disabled={registrationLoading}
			/>
			<button
				on:click={handleRegistration}
				disabled={registrationLoading}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-75"
			>
				{#if registrationLoading}Registering...{:else}Register{/if}
			</button>
		</div>
	{:else if $isLoggedIn && $userProfile}
		<CalendarComponent /> <!-- The main calendar display -->
	{:else if !$isLoggedIn}
		<p class="text-center text-gray-500 mt-10">Please log in to manage and view your calendars.</p>
	{:else}
		<p class="text-center text-gray-500 mt-10">Loading user information...</p>
	{/if}
</div>

<!-- Add EventModal component to handle event viewing/editing -->
<EventModal />

<style>
	/* Minimal global styles, relying on Tailwind mostly */
	.container {
		max-width: 1200px; /* Allow wider container for calendar view */
	}
</style>

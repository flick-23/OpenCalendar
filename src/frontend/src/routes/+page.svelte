<script lang="ts">
	import CalendarComponent from '$lib/components/Calendar.svelte'; // Renamed to avoid conflict with UserRegistryCalendar type
	import {
		isLoggedIn,
		userProfile,
		identity as authIdentity,
		fetchUserProfile
	} from '$lib/stores/authStore';
	import { calendarStore, type AppCalendar, type AppId } from '$lib/stores/calendarStore';
	import { getUserRegistryActor } from '$lib/actors/actors';
	import { onMount, onDestroy } from 'svelte';
	import type { Readable } from 'svelte/store'; // Import Readable type

	let showRegistration = false;
	let registrationName = '';
	let registrationLoading = false;
	let registrationError = '';

	// Subscribe to calendarStore values
	let userCalendars: AppCalendar[] = [];
	let selectedCalendarId: AppId | null = null;
	let isLoadingUserCalendars = false;
	let calendarStoreError: string | null = null;

	const calendarUnsubscribe = calendarStore.subscribe((value) => {
		userCalendars = value.calendars;
		selectedCalendarId = value.selectedCalendarId;
		isLoadingUserCalendars = value.isLoadingCalendars;
		calendarStoreError = value.error;
	});

	// For creating a new calendar
	let showNewCalendarForm = false;
	let newCalendarName = '';
	let newCalendarColor = '#4285F4'; // Google Blue
	let newCalendarLoading = false;
	let newCalendarError = '';

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
			// After registration, try to fetch calendars if not already done by store's auto-fetch
			if ($isLoggedIn && $userProfile) {
				calendarStore.fetchUserCalendars();
			}
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

	function handleCalendarSelection(event: Event) {
		const target = event.target as HTMLSelectElement;
		const idToSelect = BigInt(target.value); // Ensure it's BigInt for AppId
		if (idToSelect) {
			calendarStore.setSelectedCalendar(idToSelect);
		}
	}

	async function handleCreateNewCalendar() {
		if (!newCalendarName.trim()) {
			newCalendarError = 'Calendar name is required.';
			return;
		}
		newCalendarLoading = true;
		newCalendarError = '';
		try {
			const created = await calendarStore.createNewUserCalendar(newCalendarName, newCalendarColor);
			if (created) {
				showNewCalendarForm = false;
				newCalendarName = '';
				// The store should auto-select it or handle it via fetchUserCalendars
			} else {
				newCalendarError = calendarStoreError || 'Failed to create calendar.';
			}
		} catch (error: any) {
			console.error('Failed to create new calendar:', error);
			newCalendarError = error.message || 'An unexpected error occurred.';
		} finally {
			newCalendarLoading = false;
		}
	}

	onMount(async () => {
		if ($isLoggedIn && $userProfile && userCalendars.length === 0 && !isLoadingUserCalendars) {
			// If logged in, profile exists, but no calendars loaded yet, trigger fetch.
			// calendarStore might auto-fetch on identity change, this is a fallback.
			// console.log("+page.svelte onMount: Triggering fetchUserCalendars");
			await calendarStore.fetchUserCalendars();
		}
	});

	onDestroy(() => {
		if (calendarUnsubscribe) {
			calendarUnsubscribe();
		}
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
		<div class="calendar-management mb-6 p-4 bg-white rounded-lg shadow">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div class="flex-grow w-full sm:w-auto">
					<label for="calendar-select" class="block text-sm font-medium text-gray-700 mb-1"
						>Select Calendar:</label
					>
					{#if isLoadingUserCalendars}
						<p class="text-sm text-gray-500">Loading calendars...</p>
					{:else if userCalendars.length > 0}
						<select
							id="calendar-select"
							class="w-full sm:min-w-[200px] mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
							on:change={handleCalendarSelection}
							value={selectedCalendarId?.toString() || ''}
						>
							{#each userCalendars as cal (cal.id)}
								<option value={cal.id.toString()}>{cal.name || 'My Calendar'}</option>
							{/each}
						</select>
					{:else}
						<p class="text-sm text-gray-500">No calendars found. Please create one.</p>
					{/if}
					{#if calendarStoreError}<p class="text-red-500 text-xs mt-1">{calendarStoreError}</p>{/if}
				</div>
				<button
					on:click={() => (showNewCalendarForm = !showNewCalendarForm)}
					class="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
				>
					{showNewCalendarForm ? 'Cancel' : '+ New Calendar'}
				</button>
			</div>

			{#if showNewCalendarForm}
				<div class="new-calendar-form mt-4 pt-4 border-t">
					<h3 class="text-md font-semibold mb-2">Create New Calendar</h3>
					{#if newCalendarError}<p class="text-red-500 text-sm mb-2">{newCalendarError}</p>{/if}
					<input
						type="text"
						bind:value={newCalendarName}
						placeholder="My Calendar"
						class="w-full px-3 py-2 border rounded mb-2"
					/>
					<div class="flex items-center mb-3">
						<label for="new-calendar-color" class="mr-2 text-sm">Color:</label>
						<input
							type="color"
							id="new-calendar-color"
							bind:value={newCalendarColor}
							class="h-8 w-12 border rounded"
						/>
					</div>
					<button
						on:click={handleCreateNewCalendar}
						disabled={newCalendarLoading}
						class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-75"
					>
						{#if newCalendarLoading}Creating...{:else}Create Calendar{/if}
					</button>
				</div>
			{/if}
		</div>

		{#if selectedCalendarId}
			<CalendarComponent /> <!-- The main calendar display -->
		{:else if !isLoadingUserCalendars && userCalendars.length > 0}
			<p class="text-center text-gray-600">Please select a calendar to view.</p>
		{/if}
	{:else if !$isLoggedIn}
		<p class="text-center text-gray-500 mt-10">Please log in to manage and view your calendars.</p>
	{:else}
		<p class="text-center text-gray-500 mt-10">Loading user information...</p>
	{/if}
</div>

<style>
	/* Minimal global styles, relying on Tailwind mostly */
	.container {
		max-width: 1200px; /* Allow wider container for calendar view */
	}
</style>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let currentView: 'month' | 'day' | 'year' = 'month';
	export let displayDate: Date = new Date();

	const dispatch = createEventDispatcher();

	const viewOptions = [
		{ label: 'Day', value: 'day' },
		{ label: 'Month', value: 'month' },
		{ label: 'Year', value: 'year' }
	];

	// Use a reactive declaration for selectedViewLabel to ensure it updates when currentView changes.
	// $: selectedViewLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Month';


	function setCurrentView(event: Event) {
		const selectElement = event.target as HTMLSelectElement;
		const newView = selectElement.value as 'month' | 'day' | 'year';
		if (newView !== currentView) {
			dispatch('setView', newView);
		}
	}

	function navigate(direction: 'prev' | 'next' | 'today') {
		dispatch('navigate', direction);
	}

	function openEventModal() {
		dispatch('openEventModal');
	}

	$: periodLabel = (() => {
		if (currentView === 'month') {
			return displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });
		} else if (currentView === 'day') {
			return displayDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
		} else if (currentView === 'year') {
			return displayDate.getFullYear().toString();
		}
		return displayDate.toLocaleDateString(); // Fallback
	})();

</script>

<header class="px-4 py-2 flex items-center bg-white shadow sticky top-0 z-50">
	<!-- Logo and App Name -->
	<img src="/favicon.svg" alt="Calendar Icon" class="h-8 w-8 mr-2" />
	<h1 class="mr-10 text-xl text-gray-500 font-bold hidden sm:block"> {/* Hide on very small screens */}
		Calendar
	</h1>

	<!-- Today Button -->
	<button
		class="border rounded py-2 px-4 mr-2 sm:mr-5 text-gray-600 hover:bg-gray-100 text-sm sm:text-base"
		on:click={() => navigate('today')}
	>
		Today
	</button>

	<!-- Month/Day/Year Navigation Arrows -->
	<button
		class="p-1 sm:px-1 text-gray-600 hover:text-gray-800"
		aria-label="Previous period"
		on:click={() => navigate('prev')}
	>
		<span class="material-icons-outlined cursor-pointer text-gray-600 mx-1 sm:mx-2">
			chevron_left
		</span>
	</button>
	<button
		class="p-1 sm:px-1 text-gray-600 hover:text-gray-800"
		aria-label="Next period"
		on:click={() => navigate('next')}
	>
		<span class="material-icons-outlined cursor-pointer text-gray-600 mx-1 sm:mx-2">
			chevron_right
		</span>
	</button>

	<!-- Current Period Display -->
	<h2 class="ml-2 sm:ml-4 text-lg sm:text-xl text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis" style="min-width: 120px; max-width: 300px;">
		{periodLabel}
	</h2>

	<!-- Create Event Button - Moved for better flow on smaller screens -->
	<button
		title="Create new event"
		class="ml-4 sm:ml-6 p-2 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
		on:click={openEventModal}
	>
		<span class="material-icons-outlined text-blue-600">add</span>
	</button>


	<!-- Right side elements (Search, Support, Settings, View Dropdown) -->
	<div class="ml-auto flex items-center space-x-1 sm:space-x-2">
		<button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex">
			<span class="material-icons-outlined text-gray-600">search</span>
		</button>
		<button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex">
			<span class="material-icons-outlined text-gray-600">help_outline</span>
		</button>
		<button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex">
			<span class="material-icons-outlined text-gray-600">settings</span>
		</button>

		<!-- View Dropdown -->
		<div class="relative">
			<select
				bind:value={currentView}
				on:change={setCurrentView}
				aria-label="Select calendar view"
				class="appearance-none border rounded py-2 pl-3 pr-8 text-sm sm:text-base text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
			>
				{#each viewOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			 <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                <span class="material-icons-outlined text-sm">arrow_drop_down</span>
            </div>
		</div>

		<!-- Profile/Account Icon -->
		<button class="ml-1 sm:ml-3 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 hidden sm:inline-flex">
			<span class="material-icons-outlined text-gray-600">account_circle</span>
		</button>
	</div>
</header>

<!-- Note: This component uses Material Icons.
	 Make sure to include the Material Icons stylesheet in your app's main HTML file (e.g., app.html)
	 <link href="https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined" rel="stylesheet">
-->

<style lang="postcss">
	.material-icons-outlined {
		vertical-align: middle;
	}
	/* Ensure select dropdown arrow is visible and select has enough padding for it */
	select {
		/* Tailwind's appearance-none should handle this, but explicitly stating for clarity */
		/* -webkit-appearance: none;
		-moz-appearance: none;
		appearance: none; */
		/* background-image: none; Ensure no default browser arrow if appearance-none is working */
	}
</style>

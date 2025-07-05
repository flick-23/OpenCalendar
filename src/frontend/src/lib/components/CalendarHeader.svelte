<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		Plus,
		Search,
		HelpCircle,
		Settings,
		User,
		ChevronLeft,
		ChevronRight,
		ChevronDown
	} from 'lucide-svelte';

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
			return displayDate.toLocaleDateString('default', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} else if (currentView === 'year') {
			return displayDate.getFullYear().toString();
		}
		return displayDate.toLocaleDateString(); // Fallback
	})();
</script>

<header class="px-4 py-2 flex items-center bg-white shadow sticky top-0 z-50">
	<!-- Logo and App Name -->
	<img src="/favicon.svg" alt="Calendar Icon" class="h-8 w-8 mr-2" />
	<!-- Hide on very small screens -->
	<h1 class="mr-10 text-xl text-gray-500 font-bold hidden sm:block">Calendar</h1>

	<!-- Today Button -->
	<button
		class="border rounded py-2 px-4 mr-2 sm:mr-5 text-gray-600 hover:bg-gray-100 text-sm sm:text-base"
		on:click={() => navigate('today')}
	>
		Today
	</button>

	<!-- Month/Day/Year Navigation Arrows -->
	<button
		class="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
		aria-label="Previous period"
		on:click={() => navigate('prev')}
	>
		<ChevronLeft size={20} />
	</button>
	<button
		class="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
		aria-label="Next period"
		on:click={() => navigate('next')}
	>
		<ChevronRight size={20} />
	</button>

	<!-- Current Period Display -->
	<h2
		class="ml-2 sm:ml-4 text-lg sm:text-xl text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
		style="min-width: 120px; max-width: 300px;"
	>
		{periodLabel}
	</h2>

	<!-- Create Event Button - Moved for better flow on smaller screens -->
	<button
		title="Create new event"
		class="ml-4 sm:ml-6 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md"
		on:click={openEventModal}
	>
		<Plus size={20} />
	</button>

	<!-- Right side elements (Search, Support, Settings, View Dropdown) -->
	<div class="ml-auto flex items-center space-x-2">
		<button
			class="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex"
			title="Search"
		>
			<Search size={18} class="text-gray-600" />
		</button>
		<button
			class="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex"
			title="Help"
		>
			<HelpCircle size={18} class="text-gray-600" />
		</button>
		<button
			class="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden md:inline-flex"
			title="Settings"
		>
			<Settings size={18} class="text-gray-600" />
		</button>

		<!-- View Dropdown -->
		<div class="relative">
			<select
				bind:value={currentView}
				on:change={setCurrentView}
				aria-label="Calendar View"
				class="appearance-none border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
				{#each viewOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<div
				class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600"
			>
				<ChevronDown size={16} />
			</div>
		</div>

		<!-- Profile/Account Icon -->
		<button
			class="ml-2 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 hidden sm:inline-flex"
			title="Account"
		>
			<User size={18} class="text-gray-600" />
		</button>
	</div>
</header>

<!-- Note: This component now uses Lucide Svelte icons for better consistency and visual appeal -->

<style lang="postcss">
	/* Custom styles for better icon alignment and spacing */
	.lucide {
		@apply flex-shrink-0;
	}

	/* Ensure select dropdown has proper styling */
	select {
		background-image: none;
	}
</style>

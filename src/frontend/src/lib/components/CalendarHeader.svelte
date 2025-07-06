<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { logout } from '$lib/stores/authStore';
	import {
		Plus,
		Search,
		HelpCircle,
		Settings,
		User,
		ChevronLeft,
		ChevronRight,
		ChevronDown,
		LogOut
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

	const handleLogout = async () => {
		await logout();
		// The +layout.ts load function should handle redirecting to home
	};

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

<header
	class="px-4 sm:px-6 lg:px-8 py-4 flex items-center bg-white border-b border-[#f0f2f5] sticky top-0 z-50"
>
	<!-- Logo and App Name -->
	<div class="flex items-center gap-3 text-[#111418] mr-8">
		<img src="/OpenCalendar.png" alt="OpenCalendar Logo" class="h-8 w-8 flex-shrink-0" />
		<h1 class="text-xl font-bold leading-tight tracking-[-0.015em] hidden sm:block">Calendar</h1>
	</div>

	<!-- Today Button -->
	<button
		class="flex min-w-[70px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f5] text-[#111418] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#e8eaed] transition-colors mr-3"
		on:click={() => navigate('today')}
	>
		Today
	</button>

	<!-- Navigation Arrows -->
	<div class="flex items-center gap-2 mr-4">
		<button
			class="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors"
			aria-label="Previous period"
			on:click={() => navigate('prev')}
		>
			<ChevronLeft size={20} />
		</button>
		<button
			class="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors"
			aria-label="Next period"
			on:click={() => navigate('next')}
		>
			<ChevronRight size={20} />
		</button>
	</div>

	<!-- Current Period Display -->
	<h2
		class="text-[#111418] text-xl font-bold leading-tight tracking-[-0.015em] whitespace-nowrap overflow-hidden text-ellipsis"
		style="min-width: 150px; max-width: 300px;"
	>
		{periodLabel}
	</h2>

	<!-- Create Event Button -->
	<button
		title="Create new event"
		class="ml-6 flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#0c7ff2] text-white hover:bg-[#0a6fd1] transition-colors shadow-md"
		on:click={openEventModal}
	>
		<Plus size={20} />
	</button>

	<!-- Right side elements -->
	<div class="ml-auto flex items-center gap-2">
		<button
			class="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors hidden md:flex"
			title="Search"
		>
			<Search size={18} />
		</button>
		<button
			class="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors hidden md:flex"
			title="Help"
		>
			<HelpCircle size={18} />
		</button>
		<button
			class="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors hidden md:flex"
			title="Settings"
		>
			<Settings size={18} />
		</button>

		<!-- View Dropdown -->
		<div class="relative ml-2">
			<select
				bind:value={currentView}
				on:change={setCurrentView}
				aria-label="Calendar View"
				class="appearance-none border border-[#f0f2f5] rounded-lg py-2 pl-3 pr-10 text-sm bg-white text-[#111418] hover:bg-[#f0f2f5] focus:outline-none focus:ring-2 focus:ring-[#0c7ff2] focus:border-[#0c7ff2] transition-colors"
			>
				{#each viewOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<div
				class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#111418]"
			>
				<ChevronDown size={16} />
			</div>
		</div>

		<!-- Profile/Account Icon -->
		<button
			class="ml-2 flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors hidden sm:flex"
			title="Account"
		>
			<User size={18} />
		</button>

		<!-- Logout Button -->
		<button
			class="ml-2 flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[#111418] hover:bg-[#f0f2f5] transition-colors"
			title="Logout"
			on:click={handleLogout}
		>
			<LogOut size={18} />
		</button>
	</div>
</header>

<!-- Note: This component now uses Lucide Svelte icons for better consistency and visual appeal -->

<style lang="postcss">
	/* Ensure select dropdown has proper styling */
	select {
		background-image: none;
	}
</style>

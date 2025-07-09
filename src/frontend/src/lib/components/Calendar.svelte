<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { calendarStore, type Event } from '$lib/stores/calendarStore';
	import { getDefaultView } from '$lib/stores/settingsStore';
	import CalendarHeader from '$lib/components/CalendarHeader.svelte';
	import MonthView from '$lib/components/views/MonthView.svelte';
	import DayView from '$lib/components/views/DayView.svelte';
	import YearView from '$lib/components/views/YearView.svelte';
	import EventFormModal from '$lib/components/EventFormModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	type CalendarView = 'month' | 'day' | 'year';

	let currentView: CalendarView = getDefaultView() as CalendarView;
	let displayDate: Date = new Date(); // Represents the start of the current period being viewed

	let showEventModal = false;
	let eventModalDate: Date | null = null; // For pre-filling date in modal

	// Subscribe to the new simplified calendarStore
	let currentEvents: Event[] = [];
	let isLoadingEvents = false;
	let error: string | null = null;

	const unsubscribe = calendarStore.subscribe((value) => {
		currentEvents = value.events;
		isLoadingEvents = value.isLoading;
		error = value.error;
	});

	function handleSetView(event: CustomEvent<CalendarView>) {
		const newView = event.detail;
		const oldView = currentView;
		console.log(`Switching from ${oldView} to ${newView} view`);

		currentView = newView;

		// Use the new ensureEventsForView method for better cache management
		ensureEventsForViewSwitch();
	}

	function handleNavigate(event: CustomEvent<'prev' | 'next' | 'today'>) {
		const direction = event.detail;
		let newDate = new Date(displayDate);

		if (direction === 'today') {
			newDate = new Date();
		} else {
			const increment = direction === 'next' ? 1 : -1;
			if (currentView === 'month') {
				newDate.setMonth(newDate.getMonth() + increment);
			} else if (currentView === 'day') {
				newDate.setDate(newDate.getDate() + increment);
			} else if (currentView === 'year') {
				newDate.setFullYear(newDate.getFullYear() + increment);
			}
		}
		displayDate = newDate;

		// Fetch events for the new date
		fetchEventsForCurrentPeriod();
	}

	function handleOpenEventModal(event?: CustomEvent<Date>) {
		eventModalDate = event?.detail || new Date(); // Use specific date from event or today
		showEventModal = true;
	}

	function handleSwitchToMonthView(event: CustomEvent<Date>) {
		displayDate = event.detail;
		currentView = 'month';
		fetchEventsForCurrentPeriod();
	}

	function handleCloseEventModal() {
		showEventModal = false;
		eventModalDate = null;
	}

	async function handleEventSaved() {
		console.log('Event saved, refreshing events for current view');
		// Refresh events after saving to ensure UI is up to date across all views
		await fetchEventsForCurrentPeriod();
		handleCloseEventModal();
	}

	async function fetchEventsForCurrentPeriod() {
		let startDate: Date;
		let endDate: Date;

		if (currentView === 'month') {
			// For month view, fetch the entire month plus a buffer for adjacent months
			// This helps when switching from day view within the month
			const year = displayDate.getFullYear();
			const month = displayDate.getMonth();

			// Start from beginning of previous month
			startDate = new Date(year, month - 1, 1);
			startDate.setHours(0, 0, 0, 0);

			// End at end of next month
			endDate = new Date(year, month + 2, 0);
			endDate.setHours(23, 59, 59, 999);
		} else if (currentView === 'day') {
			// For day view, fetch a wider range (week) to improve performance when navigating days
			const startOfWeek = new Date(displayDate);
			startOfWeek.setDate(displayDate.getDate() - displayDate.getDay()); // Sunday
			startOfWeek.setHours(0, 0, 0, 0);

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
			endOfWeek.setHours(23, 59, 59, 999);

			startDate = startOfWeek;
			endDate = endOfWeek;
		} else if (currentView === 'year') {
			startDate = new Date(displayDate.getFullYear(), 0, 1);
			startDate.setHours(0, 0, 0, 0);
			endDate = new Date(displayDate.getFullYear(), 11, 31);
			endDate.setHours(23, 59, 59, 999);
		} else {
			console.error('Unknown view for fetching events:', currentView);
			return;
		}

		console.log(
			`Fetching events for ${currentView} view, range ${startDate.toISOString()} - ${endDate.toISOString()}`
		);

		// Use regular fetchEvents to maintain cache consistency
		await calendarStore.fetchEvents(startDate, endDate);
	}

	async function ensureEventsForViewSwitch() {
		let startDate: Date;
		let endDate: Date;

		if (currentView === 'month') {
			// For month view, ensure we have a wide range
			const year = displayDate.getFullYear();
			const month = displayDate.getMonth();

			// Start from beginning of previous month
			startDate = new Date(year, month - 1, 1);
			startDate.setHours(0, 0, 0, 0);

			// End at end of next month
			endDate = new Date(year, month + 2, 0);
			endDate.setHours(23, 59, 59, 999);
		} else if (currentView === 'day') {
			// For day view, fetch a wider range (week)
			const startOfWeek = new Date(displayDate);
			startOfWeek.setDate(displayDate.getDate() - displayDate.getDay());
			startOfWeek.setHours(0, 0, 0, 0);

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);
			endOfWeek.setHours(23, 59, 59, 999);

			startDate = startOfWeek;
			endDate = endOfWeek;
		} else if (currentView === 'year') {
			startDate = new Date(displayDate.getFullYear(), 0, 1);
			startDate.setHours(0, 0, 0, 0);
			endDate = new Date(displayDate.getFullYear(), 11, 31);
			endDate.setHours(23, 59, 59, 999);
		} else {
			console.error('Unknown view for ensuring events:', currentView);
			return;
		}

		console.log(
			`Ensuring events for ${currentView} view switch, range ${startDate.toISOString()} - ${endDate.toISOString()}`
		);

		// Use the new ensureEventsForView method for intelligent caching
		await calendarStore.ensureEventsForView(startDate, endDate);
	}

	onMount(() => {
		// Initial fetch on mount
		fetchEventsForCurrentPeriod();
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

<div
	class="calendar-container flex flex-col h-full min-h-screen bg-white"
	style="font-family: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;"
>
	<CalendarHeader
		bind:currentView
		bind:displayDate
		on:setView={handleSetView}
		on:navigate={handleNavigate}
		on:openEventModal={handleOpenEventModal}
	/>

	<div class="calendar-body flex-grow overflow-auto">
		{#if isLoadingEvents}
			<div class="text-center p-10 text-[#111418]">
				<div
					class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c7ff2] mx-auto mb-4"
				></div>
				Loading events...
			</div>
		{/if}
		{#if error}
			<div class="text-center p-10 text-red-500">
				<div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
					<p class="font-medium">Error loading events</p>
					<p class="text-sm mt-1">{error}</p>
				</div>
			</div>
		{/if}
		{#if currentView === 'month'}
			<MonthView
				bind:displayDate
				events={currentEvents}
				on:openEventModalForDate={handleOpenEventModal}
			/>
		{:else if currentView === 'day'}
			<DayView
				bind:displayDate
				events={currentEvents}
				on:openEventModalForDate={handleOpenEventModal}
			/>
		{:else if currentView === 'year'}
			<YearView
				bind:displayDate
				events={currentEvents}
				on:changeView={(e) => {
					displayDate = e.detail.date;
					currentView = e.detail.view;
					fetchEventsForCurrentPeriod();
				}}
				on:openEventModalForDate={handleOpenEventModal}
			/>
		{/if}
	</div>

	{#if showEventModal}
		<EventFormModal
			targetDate={eventModalDate}
			on:close={handleCloseEventModal}
			on:eventSaved={handleEventSaved}
		/>
	{/if}

	<!-- Settings Modal -->
	<SettingsModal />
</div>

<style lang="postcss">
	.calendar-container {
		/* Ensure it takes up viewport height if it's the main page component */
		/* min-height: 100vh; */
	}
	/* Additional global styles for calendar might go here or in app.css */
</style>

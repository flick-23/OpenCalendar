<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { calendarStore, type AppEvent } from '$lib/stores/calendarStore';
	import type { AppId } from '$lib/stores/calendarStore';
	import CalendarHeader from '$lib/components/CalendarHeader.svelte';
	import MonthView from '$lib/components/views/MonthView.svelte';
	import DayView from '$lib/components/views/DayView.svelte';
	import YearView from '$lib/components/views/YearView.svelte';
	import EventFormModal from '$lib/components/EventFormModal.svelte';

	type CalendarView = 'month' | 'day' | 'year';

	let currentView: CalendarView = 'month';
	let displayDate: Date = new Date(); // Represents the start of the current period being viewed

	let showEventModal = false;
	let eventModalDate: Date | null = null; // For pre-filling date in modal

	// Subscribe to relevant parts of calendarStore
	let storeState: import('svelte/store').Readable<ReturnType<typeof calendarStore.subscribe>>;
	let currentEvents: AppEvent[] = [];
	let currentSelectedCalendarId: AppId | null = null;
	let isLoadingEvents = false;

	const unsubscribe = calendarStore.subscribe((value) => {
		// $: console.log("Calendar.svelte store update:", value);
		currentEvents = value.events;
		currentSelectedCalendarId = value.selectedCalendarId;
		isLoadingEvents = value.isLoadingEvents;
	});

	function handleSetView(event: CustomEvent<CalendarView>) {
		currentView = event.detail;
		// Fetch events for the new view, displayDate might need adjustment
		fetchEventsForCurrentPeriod();
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
		displayDate = newDate; // This will trigger the reactive block below
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

	function handleEventClick(event: CustomEvent<AppEvent>) {
		// Handle event click - could open edit modal or show details
		console.log('Event clicked:', event.detail);
	}

	function handleCloseEventModal() {
		showEventModal = false;
		eventModalDate = null;
	}

	async function fetchEventsForCurrentPeriod() {
		if (!currentSelectedCalendarId) {
			// console.log('No calendar selected, skipping event fetch.');
			calendarStore.update((s) => ({ ...s, events: [] })); // Clear events
			return;
		}

		let startDate: Date;
		let endDate: Date;

		if (currentView === 'month') {
			startDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
			endDate = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0, 23, 59, 59, 999); // End of the month
		} else if (currentView === 'day') {
			startDate = new Date(
				displayDate.getFullYear(),
				displayDate.getMonth(),
				displayDate.getDate()
			);
			endDate = new Date(
				displayDate.getFullYear(),
				displayDate.getMonth(),
				displayDate.getDate(),
				23,
				59,
				59,
				999
			); // End of the day
		} else if (currentView === 'year') {
			startDate = new Date(displayDate.getFullYear(), 0, 1); // Start of the year
			endDate = new Date(displayDate.getFullYear(), 11, 31, 23, 59, 59, 999); // End of the year
		} else {
			console.error('Unknown view for fetching events:', currentView);
			return;
		}

		// console.log(`Fetching events for ${currentView} view, calendar ${currentSelectedCalendarId}, range ${startDate.toISOString()} - ${endDate.toISOString()}`);
		await calendarStore.fetchEvents(currentSelectedCalendarId, startDate, endDate);
	}

	// Reactive statement to fetch events when displayDate, currentView, or selectedCalendarId changes
	$: if (displayDate || currentView || currentSelectedCalendarId) {
		// console.log("Reactive trigger: displayDate, currentView, or selectedCalendarId changed. Refetching events.");
		fetchEventsForCurrentPeriod();
	}

	onMount(() => {
		// Initial fetch if a calendar is already selected (e.g. from previous session via store hydration)
		if (currentSelectedCalendarId) {
			fetchEventsForCurrentPeriod();
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

<div class="calendar-container flex flex-col h-full bg-gray-50">
	<CalendarHeader
		bind:currentView
		bind:displayDate
		on:setView={handleSetView}
		on:navigate={handleNavigate}
		on:openEventModal={handleOpenEventModal}
	/>

	<div class="calendar-body flex-grow overflow-auto p-4">
		{#if isLoadingEvents}
			<div class="text-center p-10">Loading events...</div>
		{/if}
		{#if currentView === 'month'}
			<MonthView
				bind:displayDate
				events={currentEvents}
				selectedCalendarId={currentSelectedCalendarId}
				on:openEventModalForDate={handleOpenEventModal}
			/>
		{:else if currentView === 'day'}
			<DayView
				bind:displayDate
				events={currentEvents}
				on:openEventModalForDate={handleOpenEventModal}
				on:eventClick={handleEventClick}
			/>
		{:else if currentView === 'year'}
			<YearView
				bind:displayDate
				events={currentEvents}
				on:openEventModalForDate={handleOpenEventModal}
				on:switchToMonthView={handleSwitchToMonthView}
			/>
		{/if}
	</div>

	{#if showEventModal && currentSelectedCalendarId}
		<EventFormModal
			targetDate={eventModalDate}
			calendarId={currentSelectedCalendarId}
			on:close={handleCloseEventModal}
			on:eventSaved={() => {
				fetchEventsForCurrentPeriod(); // Re-fetch events after saving
				handleCloseEventModal();
			}}
		/>
	{/if}
</div>

<style lang="postcss">
	.calendar-container {
		/* Ensure it takes up viewport height if it's the main page component */
		/* min-height: 100vh; */
	}
	/* Additional global styles for calendar might go here or in app.css */
</style>

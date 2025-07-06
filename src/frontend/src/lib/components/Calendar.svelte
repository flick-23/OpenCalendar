<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { calendarStore, type Event } from '$lib/stores/calendarStore';
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
		currentView = event.detail;
		// Fetch events for the new view
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

	async function fetchEventsForCurrentPeriod() {
		let startDate: Date;
		let endDate: Date;

		if (currentView === 'month') {
			startDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
			endDate = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0, 23, 59, 59, 999);
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
			);
		} else if (currentView === 'year') {
			startDate = new Date(displayDate.getFullYear(), 0, 1);
			endDate = new Date(displayDate.getFullYear(), 11, 31, 23, 59, 59, 999);
		} else {
			console.error('Unknown view for fetching events:', currentView);
			return;
		}

		console.log(
			`Fetching events for ${currentView} view, range ${startDate.toISOString()} - ${endDate.toISOString()}`
		);
		await calendarStore.fetchEvents(startDate, endDate);
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
				on:openEventModalForDate={handleOpenEventModal}
				on:switchToMonthView={handleSwitchToMonthView}
			/>
		{/if}
	</div>

	{#if showEventModal}
		<EventFormModal
			targetDate={eventModalDate}
			on:close={handleCloseEventModal}
			on:eventSaved={handleCloseEventModal}
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

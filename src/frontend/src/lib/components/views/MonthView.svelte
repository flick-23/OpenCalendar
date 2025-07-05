<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { calendarStore, type AppEvent } from '$lib/stores/calendarStore'; // Assuming AppEvent is exported
	import type { AppId } from '$lib/stores/calendarStore'; // Assuming AppId is exported

	export let displayDate: Date = new Date(); // The month to display
	export let events: AppEvent[] = []; // Events for the current display period
	export let selectedCalendarId: AppId | null = null;

	const dispatch = createEventDispatcher();

	let currentMonthName = '';
	let currentYear = 0;
	let daysInGrid: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];

	function updateCalendarGrid() {
		currentMonthName = displayDate.toLocaleString('default', { month: 'long' });
		currentYear = displayDate.getFullYear();

		const year = displayDate.getFullYear();
		const month = displayDate.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);
		const daysInMonth = lastDayOfMonth.getDate();
		const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

		const tempDaysInGrid = [];
		const today = new Date(); // For marking today's date

		// Add days from previous month
		const prevMonthLastDay = new Date(year, month, 0);
		const prevMonthDaysToShow = startDayOfWeek;
		for (let i = 0; i < prevMonthDaysToShow; i++) {
			const d = new Date(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), prevMonthLastDay.getDate() - i);
			tempDaysInGrid.unshift({
				date: d,
				isCurrentMonth: false,
				isToday: false // Previous month days are not today
			});
		}

		// Add days of current month
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(year, month, day);
			tempDaysInGrid.push({
				date: d,
				isCurrentMonth: true,
				isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
			});
		}

		// Add days from next month
		const totalDaysShown = tempDaysInGrid.length;
		// Ensure grid fills up to a multiple of 7, typically 35 or 42 cells
		const cellsInGrid = Math.ceil(totalDaysShown / 7) * 7 < 35 ? 35 : Math.ceil(totalDaysShown / 7) * 7;
		const nextMonthDaysToShow = cellsInGrid - totalDaysShown;


		for (let i = 1; i <= nextMonthDaysToShow; i++) {
			const d = new Date(year, month + 1, i);
			tempDaysInGrid.push({
				date: d,
				isCurrentMonth: false,
				isToday: false // Next month days are not today
			});
		}
		daysInGrid = tempDaysInGrid;
	}

	// Function to get events for a specific day from the passed 'events' prop
	function getEventsForDay(date: Date): AppEvent[] {
		return events.filter(event => {
			const eventStartDate = new Date(event.startTime); // Assuming startTime is a Date object or parsable
			return eventStartDate.getFullYear() === date.getFullYear() &&
				   eventStartDate.getMonth() === date.getMonth() &&
				   eventStartDate.getDate() === date.getDate();
		}).slice(0, 3); // Show max 3 events per day in month view, for example
	}

	function handleDayClick(dayItem: { date: Date; isCurrentMonth: boolean; isToday: boolean }) {
		if (dayItem.isCurrentMonth) {
			// Option 1: Open event modal for this day
			dispatch('openEventModalForDate', dayItem.date);
			// Option 2: Switch to Day view for this date
			// dispatch('switchToDayView', dayItem.date);
		}
	}


	$: if (displayDate) {
		updateCalendarGrid();
	}

	onMount(() => {
		updateCalendarGrid();
	});

</script>

<div class="month-view bg-white">
	<div class="days-of-week grid grid-cols-7 text-center text-sm text-gray-600 font-medium border-b border-gray-200">
		<div>Sun</div>
		<div>Mon</div>
		<div>Tue</div>
		<div>Wed</div>
		<div>Thu</div>
		<div>Fri</div>
		<div>Sat</div>
	</div>
	<div class="grid grid-cols-7 grid-rows-5 min-h-[calc(100vh-200px)]"> {/* Adjust min-height as needed */}
		{#each daysInGrid as dayItem (dayItem.date.toISOString())}
			<div
				class="day-cell border border-gray-200 p-2 flex flex-col relative hover:bg-gray-50"
				class:not-current-month={!dayItem.isCurrentMonth}
				class:today={dayItem.isToday && dayItem.isCurrentMonth}
				on:click={() => handleDayClick(dayItem)}
				role="button"
				tabindex="0"
				aria-label={`Date ${dayItem.date.toLocaleDateString()}`}
			>
				<div
					class="day-number text-xs sm:text-sm mb-1"
					class:text-gray-900={dayItem.isCurrentMonth}
					class:text-gray-400={!dayItem.isCurrentMonth}
					class:font-bold={dayItem.isToday && dayItem.isCurrentMonth}
				>
					{dayItem.date.getDate()}
				</div>
				{#if dayItem.isCurrentMonth}
					<div class="events-list space-y-1 overflow-y-auto flex-grow">
						{#each getEventsForDay(dayItem.date) as event (event.id)}
							<div
								class="event-item text-xs p-1 rounded truncate text-white"
								style:background-color={event.color || '#3b82f6'}
								title={event.title}
							>
								{event.title}
							</div>
						{/each}
						<!-- More events indicator if needed -->
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.day-cell {
		min-height: 100px; /* Minimum height for each day cell */
	}
	.not-current-month {
		@apply bg-gray-50;
	}
	.today .day-number {
		@apply bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center;
	}
	.event-item {
		/* Ensure good contrast with text if background color is light */
	}
</style>

<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { calendarStore, type Event } from '$lib/stores/calendarStore';

	export let displayDate: Date = new Date(); // The month to display
	export let events: Event[] = []; // Events for the current display period

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
			const d = new Date(
				prevMonthLastDay.getFullYear(),
				prevMonthLastDay.getMonth(),
				prevMonthLastDay.getDate() - i
			);
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
				isToday:
					d.getDate() === today.getDate() &&
					d.getMonth() === today.getMonth() &&
					d.getFullYear() === today.getFullYear()
			});
		}

		// Add days from next month
		const totalDaysShown = tempDaysInGrid.length;
		// Ensure grid fills up to a multiple of 7, typically 35 or 42 cells
		const cellsInGrid =
			Math.ceil(totalDaysShown / 7) * 7 < 35 ? 35 : Math.ceil(totalDaysShown / 7) * 7;
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
	function getEventsForDay(date: Date): Event[] {
		if (!events || events.length === 0) {
			return [];
		}

		return events
			.filter((event) => {
				// Ensure event.startTime is a Date object
				const eventStartDate =
					event.startTime instanceof Date ? event.startTime : new Date(event.startTime);

				// Check if the event starts on this day
				const sameDay =
					eventStartDate.getFullYear() === date.getFullYear() &&
					eventStartDate.getMonth() === date.getMonth() &&
					eventStartDate.getDate() === date.getDate();

				return sameDay;
			})
			.sort((a, b) => {
				// Sort by start time
				const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
				const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
				return aTime.getTime() - bTime.getTime();
			})
			.slice(0, 3); // Show max 3 events per day in month view
	}

	function handleDayClick(dayItem: { date: Date; isCurrentMonth: boolean; isToday: boolean }) {
		if (dayItem.isCurrentMonth) {
			// Option 1: Open event modal for this day
			dispatch('openEventModalForDate', dayItem.date);
			// Option 2: Switch to Day view for this date
			// dispatch('switchToDayView', dayItem.date);
		}
	}

	function handleEventClick(event: Event, domEvent: MouseEvent | KeyboardEvent) {
		// Prevent the day click from triggering
		domEvent.stopPropagation();

		// Open the event modal for editing - using uiStore still for now
		// This should be refactored to dispatch to parent Calendar component
		const eventData = {
			id: typeof event.id === 'bigint' ? event.id.toString() : event.id,
			title: event.title,
			description: event.description,
			startTime: event.startTime,
			endTime: event.endTime,
			color: event.color
		};
		uiStore.openEventModal(eventData);
	}

	$: if (displayDate) {
		updateCalendarGrid();
	}

	$: if (events) {
		// Force reactivity when events change
		console.log(`MonthView: Received ${events.length} events`);
		// Log a sample event to see the color values
		if (events.length > 0) {
			console.log(`MonthView: Sample event color:`, events[0].color);
		}
		updateCalendarGrid();
	}

	onMount(() => {
		updateCalendarGrid();
	});
</script>

<div class="month-view bg-white min-h-[calc(100vh-80px)]">
	<div class="days-of-week grid grid-cols-7 text-center bg-[#f0f2f5] border-b border-[#e8eaed]">
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Sun</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Mon</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Tue</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Wed</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Thu</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Fri</div>
		<div class="py-3 text-[#111418] text-sm font-medium leading-normal">Sat</div>
	</div>
	<div class="grid grid-cols-7 min-h-[calc(100vh-140px)]">
		{#each daysInGrid as dayItem (dayItem.date.toISOString())}
			<div
				class="day-cell border-r border-b border-[#f0f2f5] p-3 flex flex-col relative cursor-pointer hover:bg-[#f8f9fa] transition-colors"
				class:not-current-month={!dayItem.isCurrentMonth}
				class:today={dayItem.isToday && dayItem.isCurrentMonth}
				on:click={() => handleDayClick(dayItem)}
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleDayClick(dayItem);
					}
				}}
				role="button"
				tabindex="0"
				aria-label={`Date ${dayItem.date.toLocaleDateString()}`}
			>
				<div
					class="day-number text-sm font-medium leading-normal mb-2"
					class:text-[#111418]={dayItem.isCurrentMonth}
					class:text-[#9ca3af]={!dayItem.isCurrentMonth}
				>
					{dayItem.date.getDate()}
				</div>
				{#if dayItem.isCurrentMonth}
					<div class="events-list space-y-1 overflow-y-auto flex-grow">
						{#each getEventsForDay(dayItem.date) as event (event.id)}
							<div
								class="event-item text-xs px-2 py-1 rounded-md text-white cursor-pointer hover:opacity-90 transition-opacity font-medium leading-normal"
								style:background-color={event.color || '#0c7ff2'}
								title={event.description ? `${event.title} - ${event.description}` : event.title}
								on:click={(e) => handleEventClick(event, e)}
								on:keydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handleEventClick(event, e);
									}
								}}
								role="button"
								tabindex="0"
							>
								<div class="truncate">{event.title}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.day-cell {
		min-height: 120px;
		border-right: 1px solid #f0f2f5;
		border-bottom: 1px solid #f0f2f5;
	}

	.day-cell:nth-child(7n) {
		border-right: none;
	}

	.not-current-month {
		@apply bg-[#f8f9fa] opacity-50;
	}

	.today .day-number {
		@apply bg-[#0c7ff2] text-white rounded-full w-7 h-7 flex items-center justify-center font-bold;
	}

	.today {
		@apply bg-[#f0f8ff] border-[#0c7ff2];
	}

	.event-item {
		/* Remove the gradient background so inline styles take precedence */
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.event-item:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}
</style>

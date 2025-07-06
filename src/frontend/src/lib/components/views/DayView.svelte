<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import type { Event } from '$lib/stores/calendarStore';

	export let displayDate: Date = new Date(); // The day to display
	export let events: Event[] = []; // Events for the current display period

	const dispatch = createEventDispatcher();

	let currentDayFormatted: string;
	let timeSlots: { hour: number; timeLabel: string; events: Event[] }[] = [];
	let allDayEvents: Event[] = [];

	function updateDayView() {
		currentDayFormatted = displayDate.toLocaleDateString('default', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		// Get events for the current day
		const dayEvents = events.filter((event) => {
			const eventDate = new Date(event.startTime);
			return (
				eventDate.getFullYear() === displayDate.getFullYear() &&
				eventDate.getMonth() === displayDate.getMonth() &&
				eventDate.getDate() === displayDate.getDate()
			);
		});

		// Separate all-day events from timed events
		allDayEvents = dayEvents.filter((event) => {
			const start = new Date(event.startTime);
			const end = new Date(event.endTime);
			// Consider it all-day if it spans the entire day or more
			return end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000 - 1;
		});

		// Create time slots for 24 hours
		timeSlots = [];
		for (let hour = 0; hour < 24; hour++) {
			const timeLabel = formatHour(hour);
			const hourEvents = dayEvents.filter((event) => {
				const eventStart = new Date(event.startTime);
				const eventHour = eventStart.getHours();
				return eventHour === hour && !allDayEvents.includes(event);
			});

			timeSlots.push({ hour, timeLabel, events: hourEvents });
		}
	}

	function formatHour(hour: number): string {
		if (hour === 0) return '12:00 AM';
		if (hour === 12) return '12:00 PM';
		if (hour < 12) return `${hour}:00 AM`;
		return `${hour - 12}:00 PM`;
	}

	function handleTimeSlotClick(hour: number) {
		const clickedDate = new Date(displayDate);
		clickedDate.setHours(hour, 0, 0, 0);
		dispatch('openEventModalForDate', clickedDate);
	}

	function handleEventClick(event: Event) {
		// Dispatch event to parent Calendar component to handle editing
		// Create a custom event that includes both the event data and the action
		const customEvent = new CustomEvent('editEvent', {
			detail: event
		});
		// For now, we'll use the uiStore approach, but this should be refactored
		// to dispatch to the parent Calendar component
		uiStore.openEventModal({
			id: event.id,
			title: event.title,
			description: event.description,
			startTime: event.startTime,
			endTime: event.endTime,
			color: event.color
		});
	}

	function getCurrentTimePosition(): number {
		const now = new Date();
		if (
			now.getFullYear() === displayDate.getFullYear() &&
			now.getMonth() === displayDate.getMonth() &&
			now.getDate() === displayDate.getDate()
		) {
			const hours = now.getHours();
			const minutes = now.getMinutes();
			return ((hours * 60 + minutes) / (24 * 60)) * 100; // Percentage of day completed
		}
		return -1; // Not today
	}

	$: if (displayDate) {
		updateDayView();
	}

	$: currentTimePosition = getCurrentTimePosition();
</script>

<div class="day-view bg-white">
	<div class="day-header text-center mb-6">
		<h2 class="text-2xl font-bold text-gray-800">{currentDayFormatted}</h2>
		{#if displayDate.getDate() === new Date().getDate() && displayDate.getMonth() === new Date().getMonth() && displayDate.getFullYear() === new Date().getFullYear()}
			<p class="text-sm text-blue-600 mt-1">Today</p>
		{/if}
	</div>

	<!-- All-day events section -->
	{#if allDayEvents.length > 0}
		<div class="all-day-events mb-6 p-4 bg-gray-50 rounded-lg">
			<h3 class="text-sm font-semibold text-gray-700 mb-2">All Day</h3>
			<div class="space-y-2">
				{#each allDayEvents as event}
					<div
						class="event-item p-2 rounded text-white text-sm cursor-pointer hover:opacity-90"
						style:background-color={event.color || '#3b82f6'}
						on:click={() => handleEventClick(event)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleEventClick(event);
							}
						}}
						role="button"
						tabindex="0"
					>
						<div class="font-medium">{event.title}</div>
						{#if event.description}
							<div class="text-xs opacity-90 mt-1">{event.description}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Timeline view -->
	<div class="timeline-container relative">
		<!-- Current time indicator -->
		{#if currentTimePosition >= 0}
			<div
				class="current-time-line absolute left-0 right-0 h-0.5 bg-red-500 z-10 flex items-center"
				style:top="{currentTimePosition}%"
			>
				<div class="w-3 h-3 bg-red-500 rounded-full -ml-1.5"></div>
				<div class="text-xs text-red-500 ml-2 bg-white px-1">
					{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</div>
			</div>
		{/if}

		<!-- Time slots -->
		<div class="time-slots">
			{#each timeSlots as slot}
				<div
					class="time-slot flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer relative"
					on:click={() => handleTimeSlotClick(slot.hour)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleTimeSlotClick(slot.hour);
						}
					}}
					role="button"
					tabindex="0"
				>
					<div class="time-label w-20 flex-shrink-0 text-xs text-gray-500 text-right pr-4 py-2">
						{slot.timeLabel}
					</div>
					<div class="time-content flex-1 min-h-[60px] py-2 px-4 relative">
						{#each slot.events as event}
							<div
								class="event-item absolute left-4 right-4 p-2 rounded text-white text-sm cursor-pointer hover:opacity-90 z-20"
								style:background-color={event.color || '#3b82f6'}
								on:click|stopPropagation={() => handleEventClick(event)}
								on:keydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handleEventClick(event);
									}
								}}
								role="button"
								tabindex="0"
							>
								<div class="font-medium">{event.title}</div>
								{#if event.description}
									<div class="text-xs opacity-90 mt-1">{event.description}</div>
								{/if}
								<div class="text-xs opacity-75 mt-1">
									{new Date(event.startTime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})} -
									{new Date(event.endTime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style lang="postcss">
	.day-view {
		@apply p-4 max-w-4xl mx-auto;
	}
	.timeline-container {
		@apply border border-gray-200 rounded-lg overflow-hidden;
	}
	.time-slot {
		@apply transition-colors duration-150;
	}
	.time-slot:hover {
		@apply bg-blue-50;
	}
	.event-item {
		@apply shadow-sm;
	}
	.current-time-line {
		@apply pointer-events-none;
	}
</style>

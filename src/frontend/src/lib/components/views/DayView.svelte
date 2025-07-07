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
			id: typeof event.id === 'bigint' ? event.id.toString() : event.id,
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

	$: if (events) {
		updateDayView();
	}

	$: currentTimePosition = getCurrentTimePosition();
</script>

<div class="day-view bg-white min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8">
	<div class="day-header text-center mb-8 pt-6">
		<h2 class="text-[#111418] text-2xl font-bold leading-tight tracking-[-0.015em]">
			{currentDayFormatted}
		</h2>
		{#if displayDate.getDate() === new Date().getDate() && displayDate.getMonth() === new Date().getMonth() && displayDate.getFullYear() === new Date().getFullYear()}
			<p class="text-[#0c7ff2] text-sm font-medium mt-1">Today</p>
		{/if}
	</div>

	<!-- All-day events section -->
	{#if allDayEvents.length > 0}
		<div class="all-day-events mb-8 p-4 bg-[#f8f9fa] rounded-lg border border-[#f0f2f5]">
			<h3 class="text-[#111418] text-sm font-bold leading-normal mb-3">All Day</h3>
			<div class="space-y-2">
				{#each allDayEvents as event}
					<div
						class="event-item p-3 rounded-lg text-white text-sm cursor-pointer hover:opacity-90 transition-all shadow-sm"
						style:background-color={event.color || '#0c7ff2'}
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
						<div class="font-medium leading-normal">{event.title}</div>
						{#if event.description}
							<div class="text-xs opacity-90 mt-1 leading-normal">{event.description}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Timeline view -->
	<div
		class="timeline-container relative bg-white border border-[#f0f2f5] rounded-lg overflow-hidden"
	>
		<!-- Current time indicator -->
		{#if currentTimePosition >= 0}
			<div
				class="current-time-line absolute left-0 right-0 h-0.5 bg-[#0c7ff2] z-10 flex items-center"
				style:top="{currentTimePosition}%"
			>
				<div class="w-3 h-3 bg-[#0c7ff2] rounded-full -ml-1.5"></div>
				<div class="text-xs text-[#0c7ff2] ml-2 bg-white px-2 py-1 rounded font-medium">
					{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</div>
			</div>
		{/if}

		<!-- Time slots -->
		<div class="time-slots">
			{#each timeSlots as slot}
				<div
					class="time-slot flex border-b border-[#f0f2f5] hover:bg-[#f8f9fa] cursor-pointer relative transition-colors"
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
					<div
						class="time-label w-20 flex-shrink-0 text-xs text-[#9ca3af] text-right pr-4 py-3 font-medium"
					>
						{slot.timeLabel}
					</div>
					<div class="time-content flex-1 min-h-[60px] py-3 px-4 relative">
						{#each slot.events as event}
							<div
								class="event-item absolute left-4 right-4 p-3 rounded-lg text-white text-sm cursor-pointer hover:opacity-90 hover:shadow-md transition-all z-20"
								style:background-color={event.color || '#0c7ff2'}
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
								<div class="font-medium leading-normal">{event.title}</div>
								{#if event.description}
									<div class="text-xs opacity-90 mt-1 leading-normal">{event.description}</div>
								{/if}
								<div class="text-xs opacity-75 mt-1 leading-normal">
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
		max-width: 1200px;
		margin: 0 auto;
	}

	.timeline-container {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.time-slot {
		transition: all 0.2s ease;
	}

	.time-slot:hover {
		background-color: #f8f9fa;
	}

	.event-item {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		background: linear-gradient(135deg, var(--event-color, #0c7ff2), var(--event-color, #0c7ff2));
	}

	.event-item:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.current-time-line {
		pointer-events: none;
	}
</style>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AppEvent } from '$lib/stores/calendarStore';

	export let displayDate: Date = new Date(); // The year to display
	export let events: AppEvent[] = []; // Events for the current display period

	const dispatch = createEventDispatcher();

	let currentYear: number;
	let months: {
		name: string;
		date: Date;
		days: { date: Date; isToday: boolean; hasEvents: boolean }[];
	}[] = [];

	function updateYearGrid() {
		currentYear = displayDate.getFullYear();
		const today = new Date();
		months = [];

		for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
			const monthDate = new Date(currentYear, monthIndex, 1);
			const monthName = monthDate.toLocaleString('default', { month: 'long' });
			const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
			const firstDayOfWeek = monthDate.getDay(); // 0 (Sun) - 6 (Sat)

			const days = [];

			// Add empty slots for days before the first day of the month
			for (let i = 0; i < firstDayOfWeek; i++) {
				days.push({ date: new Date(0), isToday: false, hasEvents: false, isEmpty: true });
			}

			// Add days of the month
			for (let day = 1; day <= daysInMonth; day++) {
				const date = new Date(currentYear, monthIndex, day);
				const isToday =
					date.getDate() === today.getDate() &&
					date.getMonth() === today.getMonth() &&
					date.getFullYear() === today.getFullYear();
				const hasEvents = events.some((event) => {
					const eventDate = new Date(event.startTime);
					return (
						eventDate.getFullYear() === date.getFullYear() &&
						eventDate.getMonth() === date.getMonth() &&
						eventDate.getDate() === date.getDate()
					);
				});

				days.push({ date, isToday, hasEvents, isEmpty: false });
			}

			months.push({ name: monthName, date: monthDate, days });
		}
	}

	function handleMonthClick(monthDate: Date) {
		dispatch('switchToMonthView', monthDate);
	}

	function handleDayClick(date: Date) {
		dispatch('openEventModalForDate', date);
	}

	$: if (displayDate) {
		updateYearGrid();
	}
</script>

<div class="year-view bg-white">
	<div class="year-header text-center mb-8">
		<h2 class="text-3xl font-bold text-gray-800">{currentYear}</h2>
	</div>

	<div class="months-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
		{#each months as month}
			<div
				class="month-card bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
			>
				<div class="month-header bg-gray-50 px-4 py-3 border-b border-gray-200">
					<h3
						class="text-lg font-semibold text-gray-800 text-center cursor-pointer hover:text-blue-600"
						on:click={() => handleMonthClick(month.date)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleMonthClick(month.date);
							}
						}}
						role="button"
						tabindex="0"
					>
						{month.name}
					</h3>
				</div>
				<div class="month-body p-2">
					<div
						class="days-of-week grid grid-cols-7 text-center text-xs text-gray-500 font-medium mb-1"
					>
						<div>S</div>
						<div>M</div>
						<div>T</div>
						<div>W</div>
						<div>T</div>
						<div>F</div>
						<div>S</div>
					</div>
					<div class="days-grid grid grid-cols-7 gap-1">
						{#each month.days as day}
							<div
								class="day-cell w-8 h-8 flex items-center justify-center text-xs rounded cursor-pointer
									{day.isEmpty ? 'invisible' : ''}
									{day.isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-gray-100'}
									{day.hasEvents ? 'bg-blue-100 text-blue-800' : ''}
									{day.isToday && day.hasEvents ? 'bg-blue-600 text-white' : ''}
								"
								on:click={() => !day.isEmpty && handleDayClick(day.date)}
								on:keydown={(e) => {
									if (!day.isEmpty && (e.key === 'Enter' || e.key === ' ')) {
										e.preventDefault();
										handleDayClick(day.date);
									}
								}}
								role="button"
								tabindex={day.isEmpty ? -1 : 0}
								aria-label={day.isEmpty ? '' : `${day.date.toLocaleDateString()}`}
							>
								{#if !day.isEmpty}
									{day.date.getDate()}
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.year-view {
		@apply p-4;
	}
	.month-card {
		@apply transition-all duration-200;
	}
	.month-card:hover {
		@apply transform scale-105;
	}
	.day-cell {
		@apply transition-colors duration-150;
	}
</style>

<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Event } from '$lib/stores/calendarStore';

	export let displayDate: Date = new Date();
	export let events: Event[] = []; // Add events prop to match other views

	const dispatch = createEventDispatcher();

	let year: number;
	let months: { name: string; days: Date[]; monthNumber: number }[] = [];

	function getMonthName(month: number) {
		const d = new Date(displayDate.getFullYear(), month, 1);
		return d.toLocaleString('default', { month: 'long' });
	}

	function generateYearData() {
		year = displayDate.getFullYear();
		months = Array.from({ length: 12 }, (_, i) => ({
			name: getMonthName(i),
			days: getDaysInMonth(year, i),
			monthNumber: i
		}));
	}

	function getDaysInMonth(year: number, month: number) {
		const date = new Date(year, month, 1);
		const days = [];
		while (date.getMonth() === month) {
			days.push(new Date(date));
			date.setDate(date.getDate() + 1);
		}
		return days;
	}

	function handleMonthClick(month: number) {
		dispatch('changeView', { view: 'month', date: new Date(year, month, 1) });
	}

	function getEventsForDay(date: Date): Event[] {
		return events.filter((event) => {
			const eventDate = new Date(event.startTime);
			return (
				eventDate.getFullYear() === date.getFullYear() &&
				eventDate.getMonth() === date.getMonth() &&
				eventDate.getDate() === date.getDate()
			);
		});
	}

	function hasEventsForDay(date: Date): boolean {
		return getEventsForDay(date).length > 0;
	}

	onMount(() => {
		generateYearData();
	});

	$: if (displayDate) {
		generateYearData();
	}
</script>

<div class="year-view-container p-6 bg-white min-h-[calc(100vh-80px)]">
	<div class="text-center mb-8">
		<h2 class="text-3xl font-bold text-[#111418] mb-2">{year}</h2>
		<p class="text-[#637588] text-sm">Click on any month to view details</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
		{#each months as monthData, i}
			<div
				class="month-grid-item bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-[#f0f2f5] hover:border-[#0c7ff2]"
				on:click={() => handleMonthClick(i)}
				on:keydown={(e) => e.key === 'Enter' && handleMonthClick(i)}
				role="button"
				tabindex="0"
			>
				<h3 class="text-lg font-semibold text-center mb-3 text-[#111418]">{monthData.name}</h3>
				<div class="day-grid grid grid-cols-7 text-center text-xs text-[#637588] mb-2">
					<span class="py-1">Su</span>
					<span class="py-1">Mo</span>
					<span class="py-1">Tu</span>
					<span class="py-1">We</span>
					<span class="py-1">Th</span>
					<span class="py-1">Fr</span>
					<span class="py-1">Sa</span>
				</div>
				<div class="days-container grid grid-cols-7 text-center text-sm gap-1">
					<!-- Align with the first day of the week -->
					{#each Array(monthData.days[0].getDay()) as _}
						<span class="w-6 h-6"></span>
					{/each}
					{#each monthData.days as day}
						<span
							class="day-cell w-6 h-6 flex items-center justify-center text-xs rounded-full hover:bg-[#f0f8ff] transition-colors relative"
							class:bg-[#0c7ff2]={new Date().toDateString() === day.toDateString()}
							class:text-white={new Date().toDateString() === day.toDateString()}
							class:text-[#111418]={new Date().toDateString() !== day.toDateString()}
							title={hasEventsForDay(day) ? `${getEventsForDay(day).length} event(s)` : ''}
						>
							{day.getDate()}
							{#if hasEventsForDay(day)}
								<div
									class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#0c7ff2] rounded-full"
									class:bg-white={new Date().toDateString() === day.toDateString()}
								></div>
							{/if}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.year-view-container {
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
	}

	.month-grid-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.day-cell:hover {
		background-color: #0c7ff2 !important;
		color: white !important;
	}

	.day-cell {
		transition: all 0.2s ease;
	}

	.month-grid-item {
		transition: all 0.3s ease;
		border: 1px solid #e9ecef;
	}

	.month-grid-item:hover {
		border-color: #0c7ff2;
	}
</style>

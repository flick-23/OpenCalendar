<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { calendarStore, type AppEvent, type AppId } from '$lib/stores/calendarStore';
	import { Calendar, Clock } from 'lucide-svelte';

	export let targetDate: Date | null = null; // Date to pre-fill, typically from day click
	export let eventToEdit: AppEvent | null = null; // If editing an existing event
	export let calendarId: AppId; // The calendar ID to which this event belongs

	const dispatch = createEventDispatcher();

	let title = '';
	let description = '';
	// Split date and time for better UX
	let startDate = '';
	let startTime = '';
	let endDate = '';
	let endTime = '';
	let color = '#3b82f6'; // Default event color (Tailwind blue-500)

	let isLoading = false;
	let errorMessage = '';

	// Predefined color options
	const colorOptions = [
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Green', value: '#10b981' },
		{ name: 'Yellow', value: '#f59e0b' },
		{ name: 'Purple', value: '#8b5cf6' },
		{ name: 'Pink', value: '#ec4899' },
		{ name: 'Indigo', value: '#6366f1' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Gray', value: '#6b7280' }
	];

	// Helper to format Date to 'YYYY-MM-DD' for date input
	function formatDateForInput(date: Date): string {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Helper to format time to 'HH:mm' for time input
	function formatTimeForInput(date: Date): string {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	// Helper to combine date and time strings into a Date object
	function combineDateAndTime(dateStr: string, timeStr: string): Date {
		return new Date(`${dateStr}T${timeStr}`);
	}

	onMount(() => {
		if (eventToEdit) {
			title = eventToEdit.title;
			description = eventToEdit.description;
			const startDateTime = new Date(eventToEdit.startTime);
			const endDateTime = new Date(eventToEdit.endTime);
			startDate = formatDateForInput(startDateTime);
			startTime = formatTimeForInput(startDateTime);
			endDate = formatDateForInput(endDateTime);
			endTime = formatTimeForInput(endDateTime);
			color = eventToEdit.color || '#3b82f6';
		} else if (targetDate) {
			// Default new event to start at targetDate (e.g. 9 AM) and end 1 hour later
			const defaultStartTime = new Date(targetDate);
			defaultStartTime.setHours(9, 0, 0, 0);
			startDate = formatDateForInput(defaultStartTime);
			startTime = formatTimeForInput(defaultStartTime);

			const defaultEndTime = new Date(defaultStartTime);
			defaultEndTime.setHours(defaultStartTime.getHours() + 1);
			endDate = formatDateForInput(defaultEndTime);
			endTime = formatTimeForInput(defaultEndTime);
		} else {
			// Fallback if no targetDate, default to now + 1 hour
			const now = new Date();
			now.setHours(now.getHours() + 1, 0, 0, 0); // Start in the next hour
			startDate = formatDateForInput(now);
			startTime = formatTimeForInput(now);
			const later = new Date(now);
			later.setHours(now.getHours() + 1);
			endDate = formatDateForInput(later);
			endTime = formatTimeForInput(later);
		}
	});

	async function handleSubmit() {
		if (!title.trim()) {
			errorMessage = 'Title is required.';
			return;
		}
		if (!startDate || !startTime || !endDate || !endTime) {
			errorMessage = 'Start and end dates/times are required.';
			return;
		}

		const startDateTime = combineDateAndTime(startDate, startTime);
		const endDateTime = combineDateAndTime(endDate, endTime);

		if (startDateTime >= endDateTime) {
			errorMessage = 'End time must be after start time.';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const eventData = {
				calendarId, // Passed as prop
				title,
				description,
				startTime: startDateTime,
				endTime: endDateTime,
				color
			};

			if (eventToEdit && eventToEdit.id) {
				// Update existing event
				// Omit calendarId for update, as it's part of the eventId's context or not changed
				const { calendarId: _, ...updateData } = eventData;
				await calendarStore.updateEvent(eventToEdit.id, updateData);
			} else {
				// Create new event
				await calendarStore.createEvent(eventData);
			}
			dispatch('eventSaved');
			closeModal();
		} catch (error: any) {
			console.error('Failed to save event:', error);
			errorMessage = error.message || 'Failed to save event. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function closeModal() {
		dispatch('close');
	}

	// Trap focus within the modal
	function trapFocus(node: HTMLElement) {
		const focusableElements = node.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as NodeListOf<HTMLElement>;
		const firstFocusableElement = focusableElements[0];
		const lastFocusableElement = focusableElements[focusableElements.length - 1];

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Tab') {
				if (event.shiftKey) {
					// Shift + Tab
					if (document.activeElement === firstFocusableElement) {
						lastFocusableElement.focus();
						event.preventDefault();
					}
				} else {
					// Tab
					if (document.activeElement === lastFocusableElement) {
						firstFocusableElement.focus();
						event.preventDefault();
					}
				}
			} else if (event.key === 'Escape') {
				closeModal();
			}
		}

		firstFocusableElement?.focus();
		node.addEventListener('keydown', handleKeydown);
		return {
			destroy() {
				node.removeEventListener('keydown', handleKeydown);
			}
		};
	}
</script>

<div
	class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[1000]"
	on:click|self={closeModal}
	role="dialog"
	aria-modal="true"
	aria-labelledby="event-modal-title"
>
	<div
		class="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
		use:trapFocus
	>
		<h2 id="event-modal-title" class="text-xl font-semibold mb-4">
			{eventToEdit ? 'Edit Event' : 'Add New Event'}
		</h2>

		{#if errorMessage}
			<p class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
				{errorMessage}
			</p>
		{/if}

		<form on:submit|preventDefault={handleSubmit}>
			<div class="mb-4">
				<label for="event-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
				<input
					type="text"
					id="event-title"
					bind:value={title}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 mb-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="event-start-date" class="block text-sm font-medium text-gray-700 mb-1"
							>Start Date</label
						>
						<div class="relative">
							<input
								type="date"
								id="event-start-date"
								bind:value={startDate}
								required
								class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Calendar size={16} class="text-gray-400" />
							</div>
						</div>
					</div>
					<div>
						<label for="event-start-time" class="block text-sm font-medium text-gray-700 mb-1"
							>Start Time</label
						>
						<div class="relative">
							<input
								type="time"
								id="event-start-time"
								bind:value={startTime}
								required
								class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Clock size={16} class="text-gray-400" />
							</div>
						</div>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="event-end-date" class="block text-sm font-medium text-gray-700 mb-1"
							>End Date</label
						>
						<div class="relative">
							<input
								type="date"
								id="event-end-date"
								bind:value={endDate}
								required
								class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Calendar size={16} class="text-gray-400" />
							</div>
						</div>
					</div>
					<div>
						<label for="event-end-time" class="block text-sm font-medium text-gray-700 mb-1"
							>End Time</label
						>
						<div class="relative">
							<input
								type="time"
								id="event-end-time"
								bind:value={endTime}
								required
								class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Clock size={16} class="text-gray-400" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="mb-4">
				<label for="event-description" class="block text-sm font-medium text-gray-700 mb-1"
					>Description (Optional)</label
				>
				<textarea
					id="event-description"
					bind:value={description}
					rows="3"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
				></textarea>
			</div>

			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
				<div class="flex flex-wrap gap-2">
					{#each colorOptions as colorOption}
						<button
							type="button"
							class="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							class:border-gray-800={color === colorOption.value}
							class:border-gray-300={color !== colorOption.value}
							style:background-color={colorOption.value}
							on:click={() => (color = colorOption.value)}
							title={colorOption.name}
						>
							{#if color === colorOption.value}
								<span class="text-white text-sm">✓</span>
							{/if}
						</button>
					{/each}
				</div>
				<div class="mt-2">
					<label for="custom-color" class="block text-xs text-gray-500 mb-1">Custom Color</label>
					<input
						type="color"
						id="custom-color"
						bind:value={color}
						class="w-16 h-8 rounded border border-gray-300 cursor-pointer"
					/>
				</div>
			</div>

			<div class="flex justify-end space-x-3">
				<button
					type="button"
					on:click={closeModal}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isLoading}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{#if isLoading}Saving...{:else}{eventToEdit ? 'Save Changes' : 'Add Event'}{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { calendarStore, type AppEvent, type AppId } from '$lib/stores/calendarStore';

	export let targetDate: Date | null = null; // Date to pre-fill, typically from day click
	export let eventToEdit: AppEvent | null = null; // If editing an existing event
	export let calendarId: AppId; // The calendar ID to which this event belongs

	const dispatch = createEventDispatcher();

	let title = '';
	let description = '';
	// Ensure startTime and endTime are full datetime strings for <input type="datetime-local">
	let startTimeStr = '';
	let endTimeStr = '';
	let color = '#3b82f6'; // Default event color (Tailwind blue-500)

	let isLoading = false;
	let errorMessage = '';

	// Helper to format Date to 'YYYY-MM-DDTHH:mm' for datetime-local input
	function formatDateForInput(date: Date): string {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	onMount(() => {
		if (eventToEdit) {
			title = eventToEdit.title;
			description = eventToEdit.description;
			startTimeStr = formatDateForInput(new Date(eventToEdit.startTime));
			endTimeStr = formatDateForInput(new Date(eventToEdit.endTime));
			color = eventToEdit.color || '#3b82f6';
		} else if (targetDate) {
			// Default new event to start at targetDate (e.g. 9 AM) and end 1 hour later
			const defaultStartTime = new Date(targetDate);
			defaultStartTime.setHours(9, 0, 0, 0);
			startTimeStr = formatDateForInput(defaultStartTime);

			const defaultEndTime = new Date(defaultStartTime);
			defaultEndTime.setHours(defaultStartTime.getHours() + 1);
			endTimeStr = formatDateForInput(defaultEndTime);
		} else {
            // Fallback if no targetDate, default to now + 1 hour
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0); // Start in the next hour
            startTimeStr = formatDateForInput(now);
            const later = new Date(now);
            later.setHours(now.getHours() + 1);
            endTimeStr = formatDateForInput(later);
        }
	});

	async function handleSubmit() {
		if (!title.trim()) {
			errorMessage = 'Title is required.';
			return;
		}
		if (!startTimeStr || !endTimeStr) {
			errorMessage = 'Start and end times are required.';
			return;
		}

		const startTime = new Date(startTimeStr);
		const endTime = new Date(endTimeStr);

		if (startTime >= endTime) {
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
				startTime,
				endTime,
				color,
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
				if (event.shiftKey) { // Shift + Tab
					if (document.activeElement === firstFocusableElement) {
						lastFocusableElement.focus();
						event.preventDefault();
					}
				} else { // Tab
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

<div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[1000]" on:click|self={closeModal} role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
	<div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" use:trapFocus>
		<h2 id="event-modal-title" class="text-xl font-semibold mb-4">{eventToEdit ? 'Edit Event' : 'Add New Event'}</h2>

		{#if errorMessage}
			<p class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">{errorMessage}</p>
		{/if}

		<form on:submit|preventDefault={handleSubmit}>
			<div class="mb-4">
				<label for="event-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
				<input type="text" id="event-title" bind:value={title} required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<label for="event-start-time" class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
					<input type="datetime-local" id="event-start-time" bind:value={startTimeStr} required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
				</div>
				<div>
					<label for="event-end-time" class="block text-sm font-medium text-gray-700 mb-1">End Time</label>
					<input type="datetime-local" id="event-end-time" bind:value={endTimeStr} required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
				</div>
			</div>

			<div class="mb-4">
				<label for="event-description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
				<textarea id="event-description" bind:value={description} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
			</div>

			<div class="mb-6">
				<label for="event-color" class="block text-sm font-medium text-gray-700 mb-1">Color</label>
				<input type="color" id="event-color" bind:value={color} class="w-full h-10 px-1 py-1 border border-gray-300 rounded-md shadow-sm">
			</div>

			<div class="flex justify-end space-x-3">
				<button type="button" on:click={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Cancel
				</button>
				<button type="submit" disabled={isLoading} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
					{#if isLoading}Saving...{:else}{eventToEdit ? 'Save Changes' : 'Add Event'}{/if}
				</button>
			</div>
		</form>
	</div>
</div>

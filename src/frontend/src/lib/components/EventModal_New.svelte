<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { calendarStore, type Event } from '$lib/stores/calendarStore';
	import { get } from 'svelte/store';

	let modalElement: HTMLDivElement;

	// --- Component State ---
	let eventId: Event['id'] | string | number | null = null;
	let title = '';
	let description = '';
	let startTimeStr = ''; // Store as ISO-like string for datetime-local input
	let endTimeStr = ''; // Store as ISO-like string for datetime-local input

	// Separate date and time inputs
	let startDate = '';
	let startTime = '';
	let endDate = '';
	let endTime = '';

	let selectedColor = 'blue'; // Default color

	let isLoading = false;
	let errorMessage = '';

	// --- Colors (9 options for better UI) ---
	const colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

	// Map color names to hex values
	const colorMap: Record<string, string> = {
		red: '#ef4444',
		orange: '#f97316',
		yellow: '#eab308',
		green: '#22c55e',
		teal: '#14b8a6',
		blue: '#3b82f6',
		indigo: '#6366f1',
		purple: '#a855f7',
		pink: '#ec4899'
	};

	// Map color names to Tailwind classes
	const tailwindColorClasses: Record<string, string> = {
		red: 'bg-red-500',
		orange: 'bg-orange-500',
		yellow: 'bg-yellow-500',
		green: 'bg-green-500',
		teal: 'bg-teal-500',
		blue: 'bg-blue-500',
		indigo: 'bg-indigo-500',
		purple: 'bg-purple-500',
		pink: 'bg-pink-500'
	};

	// Helper function to convert hex color back to color name
	function getColorNameFromHex(hexColor: string): string {
		for (const [colorName, hexValue] of Object.entries(colorMap)) {
			if (hexValue.toLowerCase() === hexColor.toLowerCase()) {
				return colorName;
			}
		}
		// If no exact match found, default to blue
		return 'blue';
	}

	// --- Store Subscriptions ---
	let uiState = get(uiStore);
	const unsubscribeUiStore = uiStore.subscribe((value) => {
		uiState = value;
		if (value.isEventModalOpen) {
			populateForm(value.eventModalData, value.selectedDay);
		} else {
			resetForm();
		}
	});

	function populateForm(eventData: typeof uiState.eventModalData, selectedDay: Date | null) {
		if (eventData && eventData.id) {
			// Editing existing event
			eventId = eventData.id;
			title = eventData.title || '';
			description = eventData.description || '';
			// Ensure startTime and endTime are Date objects before formatting
			const sTime = eventData.startTime ? new Date(eventData.startTime) : null;
			const eTime = eventData.endTime ? new Date(eventData.endTime) : null;
			startTimeStr = sTime ? formatDateTimeLocal(sTime) : '';
			endTimeStr = eTime ? formatDateTimeLocal(eTime) : '';

			// Populate separate date and time inputs for existing events
			if (sTime) {
				startDate = formatDateOnly(sTime);
				startTime = formatTimeOnly(sTime);
			}
			if (eTime) {
				endDate = formatDateOnly(eTime);
				endTime = formatTimeOnly(eTime);
			}

			// Convert hex color back to color name for the UI
			selectedColor = eventData.color ? getColorNameFromHex(eventData.color) : 'blue';
		} else {
			// Creating new event
			eventId = null;
			title = eventData?.title || ''; // Allow pre-filled title for new event
			description = eventData?.description || '';
			// For new events, eventData.color should be a color name, but just in case...
			selectedColor = eventData?.color ? getColorNameFromHex(eventData.color) : 'blue';

			const defaultStartTime = selectedDay ? new Date(selectedDay) : new Date();
			if (!eventData?.startTime) {
				// if not prefilled by uiStore.openEventModal
				defaultStartTime.setHours(Math.max(9, new Date().getHours() + 1), 0, 0, 0); // Default to next hour or 9 AM
			} else {
				// use prefilled time
				const prefilledStartTime = new Date(eventData.startTime);
				defaultStartTime.setHours(
					prefilledStartTime.getHours(),
					prefilledStartTime.getMinutes(),
					0,
					0
				);
			}

			const defaultEndTime = new Date(defaultStartTime);
			defaultEndTime.setHours(defaultStartTime.getHours() + 1); // Default 1 hour duration

			startTimeStr = formatDateTimeLocal(defaultStartTime);
			endTimeStr = formatDateTimeLocal(defaultEndTime);

			// Populate separate date and time inputs
			startDate = formatDateOnly(defaultStartTime);
			startTime = formatTimeOnly(defaultStartTime);
			endDate = formatDateOnly(defaultEndTime);
			endTime = formatTimeOnly(defaultEndTime);
		}
	}

	function resetForm() {
		eventId = null;
		title = '';
		description = '';
		startTimeStr = '';
		endTimeStr = '';
		startDate = '';
		startTime = '';
		endDate = '';
		endTime = '';
		selectedColor = 'blue';
		errorMessage = '';
		isLoading = false;
	}

	// Helper to format Date to 'yyyy-MM-ddTHH:mm' for datetime-local input
	function formatDateTimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	// Helper to format Date to 'yyyy-MM-dd' for date input
	function formatDateOnly(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Helper to format Date to 'HH:mm' for time input
	function formatTimeOnly(date: Date): string {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	// Helper to combine separate date and time strings into a Date object
	function combineDateAndTime(dateStr: string, timeStr: string): Date {
		return new Date(`${dateStr}T${timeStr}`);
	}

	function parseDateTime(dateTimeStr: string): Date {
		return new Date(dateTimeStr);
	}

	async function handleSubmit() {
		if (!title.trim()) {
			errorMessage = 'Title is required.';
			return;
		}

		// Check if we have separate date/time inputs or datetime-local inputs
		let startDateTime: Date;
		let endDateTime: Date;

		if (startDate && startTime && endDate && endTime) {
			// Use separate date and time inputs
			if (!startDate || !startTime || !endDate || !endTime) {
				errorMessage = 'Start and end dates and times are required.';
				return;
			}
			startDateTime = combineDateAndTime(startDate, startTime);
			endDateTime = combineDateAndTime(endDate, endTime);
		} else {
			// Fallback to datetime-local inputs
			if (!startTimeStr || !endTimeStr) {
				errorMessage = 'Start and end times are required.';
				return;
			}
			startDateTime = parseDateTime(startTimeStr);
			endDateTime = parseDateTime(endTimeStr);
		}

		if (startDateTime >= endDateTime) {
			errorMessage = 'End time must be after start time.';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const eventData = {
				title,
				description,
				startTime: startDateTime,
				endTime: endDateTime,
				color: colorMap[selectedColor] || selectedColor
			};

			if (eventId) {
				// Update existing event - convert eventId to bigint if it's a string or number
				const idToUpdate =
					typeof eventId === 'string'
						? BigInt(eventId)
						: typeof eventId === 'number'
							? BigInt(eventId)
							: eventId;
				await calendarStore.updateEvent(idToUpdate, eventData);
			} else {
				// Create new event
				await calendarStore.createEvent(eventData);
			}

			uiStore.closeEventModal();
		} catch (error: any) {
			console.error('Error saving event:', error);
			errorMessage = error.message || 'An unexpected error occurred.';
		} finally {
			isLoading = false;
		}
	}

	function handleDelete() {
		if (!eventId) return;
		if (!confirm('Are you sure you want to delete this event?')) return;

		isLoading = true;
		errorMessage = '';

		// Convert eventId to bigint if it's a string or number
		const idToDelete =
			typeof eventId === 'string'
				? BigInt(eventId)
				: typeof eventId === 'number'
					? BigInt(eventId)
					: eventId;

		calendarStore
			.deleteEvent(idToDelete)
			.then(() => {
				uiStore.closeEventModal();
			})
			.catch((error) => {
				console.error('Error deleting event:', error);
				errorMessage = 'Error deleting event.';
			})
			.finally(() => (isLoading = false));
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			uiStore.closeEventModal();
		}
	}

	function closeOnClickOutside(event: MouseEvent) {
		if (modalElement && !modalElement.contains(event.target as Node)) {
			// Check if the click was on the backdrop itself, not on a child of the modal
			if (event.target === event.currentTarget) {
				uiStore.closeEventModal();
			}
		}
	}

	onMount(() => {
		document.addEventListener('keydown', closeOnEscape);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', closeOnEscape);
		if (unsubscribeUiStore) {
			unsubscribeUiStore();
		}
	});
</script>

{#if uiState.isEventModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
		on:click={closeOnClickOutside}
	>
		<div
			bind:this={modalElement}
			class="w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl transform transition-all duration-300 scale-100"
			on:click|stopPropagation
		>
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-bold text-gray-800">
						{eventId ? 'Edit Event' : 'Create New Event'}
					</h2>
					<button
						class="text-gray-400 hover:text-gray-600 transition-colors"
						on:click={() => uiStore.closeEventModal()}
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{#if errorMessage}
					<div class="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						{errorMessage}
					</div>
				{/if}

				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<!-- Title -->
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-1"> Title </label>
						<input
							id="title"
							type="text"
							bind:value={title}
							placeholder="Event title"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
							Description
						</label>
						<textarea
							id="description"
							bind:value={description}
							placeholder="Event description (optional)"
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
						></textarea>
					</div>

					<!-- Date and Time -->
					<div class="space-y-4">
						<!-- Start Date and Time -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<label for="startDate" class="block text-sm font-medium text-gray-700">
									Start Date
								</label>
								<input
									id="startDate"
									type="date"
									bind:value={startDate}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>
							<div class="space-y-2">
								<label for="startTimeInput" class="block text-sm font-medium text-gray-700">
									Start Time
								</label>
								<input
									id="startTimeInput"
									type="time"
									bind:value={startTime}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>
						</div>

						<!-- End Date and Time -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<label for="endDate" class="block text-sm font-medium text-gray-700">
									End Date
								</label>
								<input
									id="endDate"
									type="date"
									bind:value={endDate}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>
							<div class="space-y-2">
								<label for="endTimeInput" class="block text-sm font-medium text-gray-700">
									End Time
								</label>
								<input
									id="endTimeInput"
									type="time"
									bind:value={endTime}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								/>
							</div>
						</div>
					</div>

					<!-- Color Selection -->
					<fieldset class="space-y-3">
						<legend class="block text-sm font-medium text-gray-700"> Event Color </legend>
						<div class="flex flex-wrap gap-3">
							{#each colors as color}
								<button
									type="button"
									class="w-10 h-10 rounded-full border-2 transition-all duration-200 {tailwindColorClasses[
										color
									]} {selectedColor === color
										? 'border-gray-800 ring-2 ring-gray-300 scale-110'
										: 'border-gray-200 hover:border-gray-400 hover:scale-105'} shadow-sm"
									on:click={() => (selectedColor = color)}
									title={color.charAt(0).toUpperCase() + color.slice(1)}
									aria-label={`Select ${color} color`}
								>
									{#if selectedColor === color}
										<svg
											class="w-5 h-5 text-white mx-auto"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											></path>
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					</fieldset>

					<!-- Submit Buttons -->
					<div class="flex justify-between pt-4">
						<div>
							{#if eventId}
								<button
									type="button"
									class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
									on:click={handleDelete}
									disabled={isLoading}
								>
									{isLoading ? 'Deleting...' : 'Delete Event'}
								</button>
							{/if}
						</div>
						<div class="flex space-x-2">
							<button
								type="button"
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								on:click={() => uiStore.closeEventModal()}
							>
								Cancel
							</button>
							<button
								type="submit"
								class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
								disabled={isLoading}
							>
								{isLoading ? 'Saving...' : eventId ? 'Update Event' : 'Create Event'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Any additional styles can go here */
</style>

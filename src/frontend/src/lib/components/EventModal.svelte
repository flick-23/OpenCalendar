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
	let selectedColor = 'blue'; // Default color

	let isLoading = false;
	let errorMessage = '';

	// --- Colors (from reference project or Tailwind defaults) ---
	const colors = [
		'red',
		'orange',
		'yellow',
		'green',
		'teal',
		'blue',
		'indigo',
		'purple',
		'pink',
		'gray'
	];

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
		pink: '#ec4899',
		gray: '#6b7280'
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
		pink: 'bg-pink-500',
		gray: 'bg-gray-500'
	};

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
			selectedColor = eventData.color || 'blue';
		} else {
			// Creating new event
			eventId = null;
			title = eventData?.title || ''; // Allow pre-filled title for new event
			description = eventData?.description || '';
			selectedColor = eventData?.color || 'blue';

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
		}
	}

	function resetForm() {
		eventId = null;
		title = '';
		description = '';
		startTimeStr = '';
		endTimeStr = '';
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

	function parseDateTime(dateTimeStr: string): Date {
		return new Date(dateTimeStr);
	}

	async function handleSubmit() {
		if (!title.trim()) {
			errorMessage = 'Title is required.';
			return;
		}
		if (!startTimeStr || !endTimeStr) {
			errorMessage = 'Start and end times are required.';
			return;
		}

		const startTime = parseDateTime(startTimeStr);
		const endTime = parseDateTime(endTimeStr);

		if (startTime >= endTime) {
			errorMessage = 'End time must be after start time.';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const eventData = {
				title,
				description,
				startTime,
				endTime,
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
		on:keydown={(e) => {
			if (e.key === 'Escape') {
				uiStore.closeEventModal();
			}
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="event-modal-title"
	>
		<div
			bind:this={modalElement}
			class="w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl transform transition-all duration-300 scale-100"
			on:click|stopPropagation
			on:keydown={(e) => {
				if (e.key === 'Escape') {
					uiStore.closeEventModal();
				}
			}}
			role="document"
		>
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 id="event-modal-title" class="text-xl font-bold text-gray-800">
						{eventId ? 'Edit Event' : 'Create New Event'}
					</h2>
					<button
						class="text-gray-400 hover:text-gray-600 transition-colors"
						on:click={() => uiStore.closeEventModal()}
						aria-label="Close modal"
						>} >
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

					<!-- Start Time -->
					<div>
						<label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
							Start Time
						</label>
						<input
							id="startTime"
							type="datetime-local"
							bind:value={startTimeStr}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>

					<!-- End Time -->
					<div>
						<label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
							End Time
						</label>
						<input
							id="endTime"
							type="datetime-local"
							bind:value={endTimeStr}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>

					<!-- Color Selection -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 mb-2">Color</legend>
						<div class="flex flex-wrap gap-2">
							{#each colors as color}
								<button
									type="button"
									class="w-8 h-8 rounded-full border-2 transition-all duration-200 {tailwindColorClasses[
										color
									]} {selectedColor === color
										? 'border-gray-800 ring-2 ring-gray-300'
										: 'border-gray-200 hover:border-gray-400'}"
									on:click={() => (selectedColor = color)}
									title={color}
									aria-label={`Select ${color} color`}
								></button>
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

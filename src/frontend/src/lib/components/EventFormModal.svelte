<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { calendarStore, type Event } from '$lib/stores/calendarStore';
	import { X } from 'lucide-svelte';

	export let targetDate: Date | null = null; // Date to pre-fill, typically from day click
	export let eventToEdit: Event | null = null; // If editing an existing event

	const dispatch = createEventDispatcher();

	let title = '';
	let description = '';
	// Split date and time for better UX
	let startDate = '';
	let startTime = '';
	let endDate = '';
	let endTime = '';
	let color = '#3b82f6'; // Default event color (blue) matching the other modals

	let isLoading = false;
	let errorMessage = '';

	// Predefined color options matching the new design (9 colors to match other modals)
	const colorOptions = [
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Yellow', value: '#eab308' },
		{ name: 'Green', value: '#22c55e' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Indigo', value: '#6366f1' },
		{ name: 'Purple', value: '#a855f7' },
		{ name: 'Pink', value: '#ec4899' }
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
				title,
				description,
				startTime: startDateTime,
				endTime: endDateTime,
				color
			};

			if (eventToEdit && eventToEdit.id) {
				// Update existing event - ensure id is bigint
				const idToUpdate =
					typeof eventToEdit.id === 'string' ? BigInt(eventToEdit.id) : eventToEdit.id;
				await calendarStore.updateEvent(idToUpdate, eventData);
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
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
	on:click|self={closeModal}
	on:keydown={(e) => {
		if (e.key === 'Escape') closeModal();
	}}
	role="dialog"
	tabindex="0"
	aria-modal="true"
	aria-labelledby="event-modal-title"
>
	<div
		class="bg-[#f8f9fc] rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
		style="font-family: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;"
		use:trapFocus
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-[#e6e9f4] px-6 py-4">
			<h2
				id="event-modal-title"
				class="text-[#0d0f1c] text-2xl font-bold leading-tight tracking-[-0.015em]"
			>
				{eventToEdit ? 'Edit Event' : 'New Event'}
			</h2>
			<button
				type="button"
				class="text-[#47569e] hover:text-[#0d0f1c] transition-colors"
				on:click={closeModal}
			>
				<X size={24} />
			</button>
		</div>

		<!-- Form Content -->
		<div class="px-6 py-4">
			{#if errorMessage}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-red-600 text-sm font-medium">{errorMessage}</p>
				</div>
			{/if}

			<form on:submit|preventDefault={handleSubmit}>
				<!-- Title -->
				<div class="mb-6">
					<label
						for="event-title"
						class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
					>
						Title
					</label>
					<input
						type="text"
						id="event-title"
						bind:value={title}
						required
						placeholder="Add title"
						class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none h-14 placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
					/>
				</div>

				<!-- Description -->
				<div class="mb-6">
					<label
						for="event-description"
						class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
					>
						Description
					</label>
					<textarea
						id="event-description"
						bind:value={description}
						placeholder="Add description"
						rows="3"
						class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
					></textarea>
				</div>

				<!-- Start and End Date -->
				<div class="grid grid-cols-2 gap-4 mb-6">
					<div>
						<label
							for="event-start-date"
							class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
						>
							Start Date
						</label>
						<input
							type="date"
							id="event-start-date"
							bind:value={startDate}
							required
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none h-14 placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
						/>
					</div>
					<div>
						<label
							for="event-end-date"
							class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
						>
							End Date
						</label>
						<input
							type="date"
							id="event-end-date"
							bind:value={endDate}
							required
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none h-14 placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
						/>
					</div>
				</div>
				<!-- Start and End Time -->
				<div class="grid grid-cols-2 gap-4 mb-6">
					<div>
						<label
							for="event-start-time"
							class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
						>
							Start Time
						</label>
						<input
							type="time"
							id="event-start-time"
							bind:value={startTime}
							required
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none h-14 placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
						/>
					</div>
					<div>
						<label
							for="event-end-time"
							class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
						>
							End Time
						</label>
						<input
							type="time"
							id="event-end-time"
							bind:value={endTime}
							required
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d0f1c] focus:outline-0 focus:ring-0 border-none bg-[#e6e9f4] focus:border-none h-14 placeholder:text-[#47569e] p-4 text-base font-normal leading-normal"
						/>
					</div>
				</div>
				<!-- Color Selection -->
				<div class="mb-6">
					<label
						for="event-color"
						class="block text-[#0d0f1c] text-base font-medium leading-normal pb-2"
					>
						Color
					</label>
					<div id="event-color" class="flex flex-wrap gap-3">
						{#each colorOptions as colorOption}
							<button
								type="button"
								class="w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#607afb] focus:ring-offset-2"
								class:border-[#0d0f1c]={color === colorOption.value}
								class:border-transparent={color !== colorOption.value}
								style:background-color={colorOption.value}
								on:click={() => (color = colorOption.value)}
								title={colorOption.name}
							>
								{#if color === colorOption.value}
									<span class="text-white text-sm font-bold">✓</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={closeModal}
						class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#e6e9f4] text-[#0d0f1c] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#d1d5db] transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading}
						class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#607afb] text-[#f8f9fc] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4f46e5] transition-colors disabled:opacity-50"
					>
						{#if isLoading}
							Saving...
						{:else}
							{eventToEdit ? 'Save Changes' : 'Save'}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

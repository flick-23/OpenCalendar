<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { uiStore } from '$lib/stores/uiStore';
  import { calendarStore, type AppEvent } from '$lib/stores/calendarStore';
  import { get } from 'svelte/store';

  let modalElement: HTMLDivElement;

  // --- Component State ---
  let eventId: AppEvent['id'] | null = null;
  let title = '';
  let description = '';
  let startTimeStr = ''; // Store as ISO-like string for datetime-local input
  let endTimeStr = '';   // Store as ISO-like string for datetime-local input
  let selectedColor = 'blue'; // Default color
  let calendarIdForEvent: AppEvent['calendarId'] | null = null;

  let isLoading = false;
  let errorMessage = '';

  // --- Colors (from reference project or Tailwind defaults) ---
  const colors = [
    "red", "orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink", "gray"
  ];
  const tailwindColorClasses: Record<string, string> = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    gray: "bg-gray-500",
  };

  // --- Store Subscriptions ---
  let uiState = get(uiStore);
  const unsubscribeUiStore = uiStore.subscribe(value => {
    uiState = value;
    if (value.isEventModalOpen) {
      populateForm(value.eventModalData, value.selectedDay);
    } else {
      resetForm();
    }
  });

  function populateForm(eventData: typeof uiState.eventModalData, selectedDay: Date | null) {
    if (eventData && eventData.id) { // Editing existing event
      eventId = eventData.id;
      title = eventData.title || '';
      description = eventData.description || '';
      // Ensure startTime and endTime are Date objects before formatting
      const sTime = eventData.startTime ? new Date(eventData.startTime) : null;
      const eTime = eventData.endTime ? new Date(eventData.endTime) : null;
      startTimeStr = sTime ? formatDateTimeLocal(sTime) : '';
      endTimeStr = eTime ? formatDateTimeLocal(eTime) : '';
      selectedColor = eventData.color || 'blue';
      calendarIdForEvent = eventData.calendarId || get(calendarStore).selectedCalendarId;
    } else { // Creating new event
      eventId = null;
      title = eventData?.title || ''; // Allow pre-filled title for new event
      description = eventData?.description || '';
      selectedColor = eventData?.color || 'blue';
      calendarIdForEvent = eventData?.calendarId || get(calendarStore).selectedCalendarId;

      const defaultStartTime = selectedDay ? new Date(selectedDay) : new Date();
      if (!eventData?.startTime) { // if not prefilled by uiStore.openEventModal
        defaultStartTime.setHours(Math.max(9, new Date().getHours() +1 ), 0, 0, 0); // Default to next hour or 9 AM
      } else {
        // use prefilled time
        const prefilledStartTime = new Date(eventData.startTime);
        defaultStartTime.setHours(prefilledStartTime.getHours(), prefilledStartTime.getMinutes(),0,0);
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
    calendarIdForEvent = null;
  }

  // Helper to format Date to 'yyyy-MM-ddTHH:mm' for datetime-local input
  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function handleSubmit() {
    isLoading = true;
    errorMessage = '';

    if (!title) {
      errorMessage = 'Title is required.';
      isLoading = false;
      return;
    }
    if (!startTimeStr || !endTimeStr) {
      errorMessage = 'Start and end times are required.';
      isLoading = false;
      return;
    }

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    if (startTime >= endTime) {
      errorMessage = 'End time must be after start time.';
      isLoading = false;
      return;
    }

    const currentSelectedCalendarId = calendarIdForEvent || get(calendarStore).selectedCalendarId;
    if (!currentSelectedCalendarId) {
        errorMessage = "No calendar selected for the event.";
        isLoading = false;
        return;
    }

    const eventDataToSave = {
      title,
      description,
      startTime,
      endTime,
      color: selectedColor,
      calendarId: currentSelectedCalendarId,
    };

    try {
      let success = false;
      if (eventId) { // Update existing event
        const updatedEvent = await calendarStore.updateEvent(eventId, eventDataToSave);
        success = !!updatedEvent;
      } else { // Create new event
        const newEvent = await calendarStore.createEvent(eventDataToSave);
        success = !!newEvent;
      }

      if (success) {
        uiStore.closeEventModal();
      } else {
        errorMessage = 'Failed to save event. Please try again.';
      }
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
    calendarStore.deleteEvent(eventId)
      .then(success => {
        if (success) {
          uiStore.closeEventModal();
        } else {
          errorMessage = 'Failed to delete event.';
        }
      })
      .catch(error => {
        console.error('Error deleting event:', error);
        errorMessage = 'Error deleting event.';
      })
      .finally(() => isLoading = false);
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
    window.addEventListener('keydown', closeOnEscape);
    // Initial population in case the modal is already open when component mounts (e.g. SSR or direct link)
    if (uiState.isEventModalOpen) {
        populateForm(uiState.eventModalData, uiState.selectedDay);
    }
  });

  onDestroy(() => {
    window.removeEventListener('keydown', closeOnEscape);
    unsubscribeUiStore();
  });

</script>

<div
  class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
  class:opacity-100={uiState.isEventModalOpen}
  class:opacity-0={!uiState.isEventModalOpen}
  class:pointer-events-auto={uiState.isEventModalOpen}
  class:pointer-events-none={!uiState.isEventModalOpen}
  on:click={closeOnClickOutside}
  role="dialog"
  aria-labelledby="event-modal-title"
  aria-modal="true"
>
  <div bind:this={modalElement} class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all duration-300 ease-in-out"
    class:scale-100={uiState.isEventModalOpen}
    class:scale-95={!uiState.isEventModalOpen}
  >
    <header class="flex items-center justify-between pb-3 border-b">
      <h2 id="event-modal-title" class="text-lg font-medium text-gray-900">
        {eventId ? 'Edit Event' : 'Create Event'}
      </h2>
      {#if eventId}
        <button
          on:click={handleDelete}
          disabled={isLoading}
          class="p-1 text-gray-400 hover:text-red-500 disabled:text-gray-300"
          aria-label="Delete event"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      {/if}
      <button on:click={() => uiStore.closeEventModal()} class="p-1 text-gray-400 hover:text-gray-600" aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <form on:submit|preventDefault={handleSubmit} class="mt-4 space-y-4">
      {#if errorMessage}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          {errorMessage}
        </div>
      {/if}

      <div>
        <label for="title" class="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="title"
          bind:value={title}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label for="startTime" class="block text-sm font-medium text-gray-700">Start Time</label>
        <input
          type="datetime-local"
          id="startTime"
          bind:value={startTimeStr}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label for="endTime" class="block text-sm font-medium text-gray-700">End Time</label>
        <input
          type="datetime-local"
          id="endTime"
          bind:value={endTimeStr}
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          bind:value={description}
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>

      <div>
        <span class="block text-sm font-medium text-gray-700">Color</span>
        <div class="mt-2 flex space-x-2">
          {#each colors as color}
            <button
              type="button"
              on:click={() => selectedColor = color}
              class={`w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${tailwindColorClasses[color] || 'bg-gray-500'}`}
              class:ring-2={selectedColor === color}
              class:ring-offset-2={selectedColor === color}
              class:ring-black={selectedColor === color}
              aria-label={`Select color ${color}`}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Calendar selection (if multiple calendars are supported) -->
      <!-- <select bind:value={calendarIdForEvent}> ... </select> -->


      <footer class="pt-4 flex justify-end space-x-3 border-t mt-6">
        <button
          type="button"
          on:click={() => uiStore.closeEventModal()}
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
        >
          {#if isLoading}
            Saving...
          {:else}
            Save Event
          {/if}
        </button>
      </footer>
    </form>
  </div>
</div>

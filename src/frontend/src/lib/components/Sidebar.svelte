<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { uiStore } from '$lib/stores/uiStore'; // To open event modal

  const dispatch = createEventDispatcher();

  function openCreateEventModal() {
    uiStore.openEventModal(null); // null for creating a new event
  }

  // Placeholder for small calendar (can be a separate component later)
  // For now, just a button or static display
  const today = new Date();
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  // This is a very simplified representation. A real mini-calendar is more complex.
  const getMiniCalendarDays = () => {
    const date = new Date(today.getFullYear(), today.getMonth(), 1);
    const days = [];
    const firstDayOfMonth = date.getDay();
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, isToday: false }); // Fill blanks
    }
    while (date.getMonth() === today.getMonth()) {
      days.push({ day: date.getDate(), isToday: date.getDate() === today.getDate() });
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  $: miniCalendarDays = getMiniCalendarDays();
  $: currentMonthYear = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Placeholder for labels/calendars list
  // This would come from a store (e.g., calendarStore)
  const myCalendars = [
    { id: 'cal1', name: 'Personal', color: 'blue-500', checked: true },
    { id: 'cal2', name: 'Work', color: 'green-500', checked: true },
    { id: 'cal3', name: 'Family', color: 'purple-500', checked: false },
  ];
</script>

<aside class="border p-5 w-64 bg-white shadow-lg">
  <button
    on:click={openCreateEventModal}
    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-full shadow-md flex items-center justify-center w-full"
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 mr-2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    Create
  </button>

  <!-- Mini Calendar Placeholder -->
  <div class="mt-8">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-sm font-semibold text-gray-700">{currentMonthYear}</h3>
      <!-- Mini cal navigation (optional) -->
    </div>
    <div class="grid grid-cols-7 gap-1 text-xs text-center text-gray-500">
      {#each daysOfWeek as dayName}
        <div>{dayName}</div>
      {/each}
    </div>
    <div class="grid grid-cols-7 gap-1 mt-1 text-xs text-center">
      {#each miniCalendarDays as dayObj}
        <div class="p-1">
          {#if dayObj.day}
            <span class:bg-blue-500={dayObj.isToday} class:text-white={dayObj.isToday} class="rounded-full px-1">
              {dayObj.day}
            </span>
          {:else}
            <span>&nbsp;</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- My Calendars / Labels Section -->
  <div class="mt-8">
    <h3 class="text-sm font-semibold text-gray-700 mb-3">My Calendars</h3>
    <div class="space-y-2">
      {#each myCalendars as calendarItem}
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={calendarItem.checked}
            class="form-checkbox h-5 w-5 text-{calendarItem.color} rounded border-gray-300 focus:ring-{calendarItem.color}"
            on:change={() => dispatch('calendarToggle', calendarItem.id)}
          />
          <span class="text-sm text-gray-600">{calendarItem.name}</span>
        </label>
      {/each}
    </div>
  </div>

</aside>

<style lang="postcss">
  /* Ensure form-checkbox styles from Tailwind/forms plugin are available if you use it */
  /* Or style checkboxes manually */
  .form-checkbox {
    appearance: none;
    padding: 0;
    print-color-adjust: exact;
    display: inline-block;
    vertical-align: middle;
    background-origin: border-box;
    user-select: none;
    flex-shrink: 0;
    height: 1rem; /* 16px */
    width: 1rem;  /* 16px */
    color: #2563eb; /* Default blue-600, will be overridden by text-{color} */
    background-color: #fff;
    border-color: #6b7280; /* gray-500 */
    border-width: 1px;
    border-radius: 0.25rem; /* rounded */
  }
  .form-checkbox:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    border-color: transparent;
    background-color: currentColor; /* Uses the text-{color} utility */
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* Example: if you had a blue checkbox */
  .form-checkbox.text-blue-500:checked {
    /* Tailwind handles this with text-color utility. This is for illustration. */
    /* background-color: #3b82f6; */
  }
  /* Add more styles if needed */
</style>

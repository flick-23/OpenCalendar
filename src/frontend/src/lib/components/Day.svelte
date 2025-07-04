<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let date: Date;
  export let isCurrentMonth: boolean;
  export let isToday: boolean;
  export let events: App.Event[] = []; // Events for this specific day

  const dispatch = createEventDispatcher();

  function handleEventClick(event: App.Event, domEvent: MouseEvent) {
    domEvent.stopPropagation(); // Prevent day click if event is clicked
    dispatch('eventclick', event);
  }

  function handleDayHeaderClick() {
    // Could be used to switch to a "Day View" or similar action
    // For now, the parent Month.svelte handles generic day click for opening modal
    console.log("Day header clicked:", date.toLocaleDateString());
  }

  $: dayNumber = date.getDate();
  $: dayClasses = `
    text-sm p-1 my-1 text-center w-7 h-7 flex items-center justify-center rounded-full
    ${isToday ? 'bg-blue-500 text-white' : ''}
    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
  `;
</script>

<div class="flex flex-col h-full">
  <header class="flex flex-col items-center" on:click={handleDayHeaderClick}>
    {#if dayNumber === 1 && isCurrentMonth}
      <p class="text-xs text-blue-600 font-semibold">
        {date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
      </p>
    {/if}
    <p class="{dayClasses}">
      {dayNumber}
    </p>
  </header>

  <div class="flex-grow overflow-y-auto hide-scrollbar p-1 space-y-1">
    {#each events as event (event.id)}
      <div
        on:click={(domEvent) => handleEventClick(event, domEvent)}
        class="text-xs p-1 rounded-md text-white cursor-pointer hover:opacity-80"
        style="background-color: {event.color || 'blue'};"
        title={event.title}
      >
        {event.title}
      </div>
    {/if :else}
      <!-- {#if isCurrentMonth}
        <div class="text-xs text-gray-400 text-center h-full flex items-center justify-center">
            No events
        </div>
      {/if} -->
    {/each}
  </div>
</div>

<style lang="postcss">
  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
</style>

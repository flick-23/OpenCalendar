<script lang="ts">
  // import Day from './Day.svelte'; // Will be used to render each day cell

  // Props will be added later:
  // export let month: Date[][]; // A 2D array representing weeks and days of the month
  // export let onDayClick: (day: Date) => void;
  // export let events: YourEventType[]; // To pass events to Day components

  // Placeholder for the days of the week headers
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Placeholder for a 5-week month structure.
  // Each inner array is a week, each item in a week is a day.
  // In a real implementation, this would be dynamically generated based on the current month.
  const sampleMonthGrid = [
    [ // Week 1
      { date: 26, isCurrentMonth: false, isToday: false, events: [] }, { date: 27, isCurrentMonth: false, isToday: false, events: [] }, { date: 28, isCurrentMonth: false, isToday: false, events: [] }, { date: 29, isCurrentMonth: false, isToday: false, events: [] }, { date: 30, isCurrentMonth: false, isToday: false, events: [] }, { date: 1, isCurrentMonth: true, isToday: false, events: [{title: "Event 1"}] } , { date: 2, isCurrentMonth: true, isToday: false, events: [] }
    ],
    [ // Week 2
      { date: 3, isCurrentMonth: true, isToday: false, events: [] }, { date: 4, isCurrentMonth: true, isToday: false, events: [] }, { date: 5, isCurrentMonth: true, isToday: false, events: [{title: "Event 2"}, {title: "Event 3"}] }, { date: 6, isCurrentMonth: true, isToday: false, events: [] }, { date: 7, isCurrentMonth: true, isToday: true, events: [] }, { date: 8, isCurrentMonth: true, isToday: false, events: [] }, { date: 9, isCurrentMonth: true, isToday: false, events: [] }
    ],
    [ // Week 3
      { date: 10, isCurrentMonth: true, isToday: false, events: [] }, { date: 11, isCurrentMonth: true, isToday: false, events: [] }, { date: 12, isCurrentMonth: true, isToday: false, events: [] }, { date: 13, isCurrentMonth: true, isToday: false, events: [{title: "Long Event that spans multiple days"}] }, { date: 14, isCurrentMonth: true, isToday: false, events: [] }, { date: 15, isCurrentMonth: true, isToday: false, events: [] }, { date: 16, isCurrentMonth: true, isToday: false, events: [] }
    ],
    [ // Week 4
      { date: 17, isCurrentMonth: true, isToday: false, events: [] }, { date: 18, isCurrentMonth: true, isToday: false, events: [] }, { date: 19, isCurrentMonth: true, isToday: false, events: [] }, { date: 20, isCurrentMonth: true, isToday: false, events: [] }, { date: 21, isCurrentMonth: true, isToday: false, events: [] }, { date: 22, isCurrentMonth: true, isToday: false, events: [] }, { date: 23, isCurrentMonth: true, isToday: false, events: [] }
    ],
    [ // Week 5
      { date: 24, isCurrentMonth: true, isToday: false, events: [] }, { date: 25, isCurrentMonth: true, isToday: false, events: [] }, { date: 26, isCurrentMonth: true, isToday: false, events: [] }, { date: 27, isCurrentMonth: true, isToday: false, events: [] }, { date: 28, isCurrentMonth: true, isToday: false, events: [] }, { date: 29, isCurrentMonth: true, isToday: false, events: [] }, { date: 30, isCurrentMonth: true, isToday: false, events: [] }
    ],
    // Some months might have 6 weeks displayed
    // [ // Week 6 (optional)
    //   { date: 31, isCurrentMonth: true, isToday: false, events: [] }, { date: 1, isCurrentMonth: false, isToday: false, events: [] }, { date: 2, isCurrentMonth: false, isToday: false, events: [] }, { date: 3, isCurrentMonth: false, isToday: false, events: [] }, { date: 4, isCurrentMonth: false, isToday: false, events: [] }, { date: 5, isCurrentMonth: false, isToday: false, events: [] }, { date: 6, isCurrentMonth: false, isToday: false, events: [] }
    // ],
  ];

  // Dummy Day component structure for now, will be replaced by importing Day.svelte
  const DayComponent = (dayData) => `
    <div class="border border-gray-200 flex flex-col h-32 md:h-40 transition-colors duration-150 ease-in-out ${!dayData.isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-gray-50 cursor-pointer'}">
      <header class="flex flex-col items-center p-1">
        ${dayData.isToday ?
          `<p class="text-sm mt-1 text-center w-7 h-7 rounded-full bg-blue-500 text-white font-semibold">${dayData.date}</p>` :
          `<p class="text-sm mt-1 text-center ${!dayData.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}">${dayData.date}</p>`
        }
      </header>
      <div class="flex-1 overflow-y-auto p-1 text-xs">
        ${dayData.events.map(event =>
          `<div class="bg-blue-500 text-white rounded px-1 mb-0.5 truncate" title="${event.title}">${event.title}</div>`
        ).join('')}
      </div>
    </div>
  `;

</script>

<div class="flex-1 grid grid-cols-7 grid-rows-auto md:grid-rows-5 lg:grid-rows-6 h-full shadow-sm">
  <!-- Day of Week Headers -->
  {#each daysOfWeek as dayName, i}
    <div class="text-center py-2 border-b border-r border-gray-200 bg-gray-50">
      <p class="text-xs md:text-sm text-gray-500 font-medium">{dayName}</p>
    </div>
  {/each}

  <!-- Month Grid -->
  {#each sampleMonthGrid as week, weekIndex}
    {#each week as day, dayIndex}
      <!--
        This will be replaced by:
        <Day day={day} on:click={() => onDayClick(day.fullDateObject)} />
      -->
      {@html DayComponent(day)}
    {/each}
  {/each}
</div>

<style lang="postcss">
  /* Ensure the grid takes up available height. The parent container of Month.svelte should manage this. */
  /* For example, if Month.svelte is in a flex container, it should have flex-1. */
  /* The grid-rows-5 or grid-rows-6 helps distribute the height among weeks. */
  /* The h-full on the root div might need to be adjusted based on parent layout. */
</style>

<script lang="ts">
  // Props will be added later to handle date changes, view changes etc.
  // For now, static structure and styling.
  // Example:
  // export let currentMonth: Date;
  // export let onNextMonth: () => void;
  // export let onPreviousMonth: () => void;
  // export let onGoToToday: () => void;

  // Placeholder for current month display
  const displayMonth = "Month Year"; // e.g., "July 2024" - will be dynamic later
</script>

<header class="px-4 py-2 flex items-center bg-white shadow">
  <!-- Logo and App Name -->
  <img src="/favicon.svg" alt="Calendar Icon" class="h-8 w-8 mr-2" />
  <h1 class="mr-10 text-xl text-gray-500 font-bold">
    Calendar
  </h1>

  <!-- Today Button -->
  <button
    class="border rounded py-2 px-4 mr-5 text-gray-600 hover:bg-gray-100"
    on:click={() => console.log("Go to Today clicked (logic TBD)")}
  >
    Today
  </button>

  <!-- Month Navigation Arrows -->
  <button
    class="px-1 text-gray-600 hover:text-gray-800"
    on:click={() => console.log("Previous month clicked (logic TBD)")}
  >
    <span class="material-icons-outlined cursor-pointer text-gray-600 mx-2">
      chevron_left
    </span>
  </button>
  <button
    class="px-1 text-gray-600 hover:text-gray-800"
    on:click={() => console.log("Next month clicked (logic TBD)")}
  >
    <span class="material-icons-outlined cursor-pointer text-gray-600 mx-2">
      chevron_right
    </span>
  </button>

  <!-- Current Month Display -->
  <h2 class="ml-4 text-xl text-gray-500 font-medium">
    {displayMonth}
  </h2>

  <!-- Right side elements (Search, Support, Settings, View Dropdown) - simplified for now -->
  <div class="ml-auto flex items-center">
    <button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400">
      <span class="material-icons-outlined text-gray-600">search</span>
    </button>
    <button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 ml-2">
      <span class="material-icons-outlined text-gray-600">help_outline</span>
    </button>
    <button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 ml-2">
      <span class="material-icons-outlined text-gray-600">settings</span>
    </button>

    <!-- View Dropdown (Simplified) -->
    <div class="ml-3 relative">
      <button class="border rounded py-2 px-3 text-gray-600 hover:bg-gray-100 flex items-center">
        Month
        <span class="material-icons-outlined text-sm text-gray-600 ml-1">arrow_drop_down</span>
      </button>
      <!-- Dropdown content would go here, hidden by default -->
    </div>

    <!-- Profile/Account Icon -->
     <button class="ml-3 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
      <span class="material-icons-outlined text-gray-600">account_circle</span>
    </button>
  </div>
</header>

<!-- Note: This component uses Material Icons.
     Make sure to include the Material Icons stylesheet in your app's main HTML file (e.g., app.html)
     <link href="https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined" rel="stylesheet">
-->

<style lang="postcss">
  /* Add any component-specific styles if Tailwind classes are not sufficient */
  /* For example, ensuring material icons align well if needed */
  .material-icons-outlined {
    vertical-align: middle;
  }
</style>

<script>
  import { onMount } from 'svelte';
  import { events as eventStore, addEvent, getEventsForDate } from '$lib/stores/eventStore.js';

  let currentDate = new Date();
  let currentMonthName = '';
  let currentYear = 0;
  let daysInGrid = [];

  function updateCalendar() {
    currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    currentYear = currentDate.getFullYear();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    const tempDaysInGrid = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDaysToShow = startDayOfWeek;
    for (let i = 0; i < prevMonthDaysToShow; i++) {
      tempDaysInGrid.unshift({
        date: new Date(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), prevMonthLastDay.getDate() - i),
        isCurrentMonth: false
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      tempDaysInGrid.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }

    // Add days from next month
    const totalDaysShown = tempDaysInGrid.length;
    const nextMonthDaysToShow = (7 - (totalDaysShown % 7)) % 7; // Ensure grid fills up to a multiple of 7

    for (let i = 1; i <= nextMonthDaysToShow; i++) {
      tempDaysInGrid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    daysInGrid = tempDaysInGrid;
  }

  function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  }

  function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  }

  onMount(() => {
    updateCalendar();
  });

  function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // Event form
  let showEventForm = false;
  let newEventTitle = '';
  let newEventDate = new Date().toISOString().split('T')[0]; // Default to today

  function openEventForm(date) {
    newEventDate = date.toISOString().split('T')[0];
    showEventForm = true;
  }

  function handleAddEvent() {
    if (newEventTitle.trim() === '') {
      alert('Please enter an event title.');
      return;
    }
    addEvent({ title: newEventTitle, date: newEventDate });
    newEventTitle = '';
    showEventForm = false;
    // No need to call updateCalendar, store subscription will update UI
  }
</script>

{#if showEventForm}
<div class="modal-backdrop" on:click={() => showEventForm = false}></div>
<div class="event-form-modal">
  <h3>Add New Event</h3>
  <label for="event-title">Title:</label>
  <input type="text" id="event-title" bind:value={newEventTitle} />
  <label for="event-date">Date:</label>
  <input type="date" id="event-date" bind:value={newEventDate} />
  <div class="form-buttons">
    <button on:click={handleAddEvent}>Add Event</button>
    <button on:click={() => showEventForm = false}>Cancel</button>
  </div>
</div>
{/if}

<div class="calendar">
  <div class="header">
    <button on:click={previousMonth}>&lt;</button>
    <h2>{currentMonthName} {currentYear}</h2>
    <button on:click={() => openEventForm(new Date())}>+ Add Event</button>
    <button on:click={nextMonth}>&gt;</button>
  </div>
  <div class="days-of-week">
    <div>Sun</div>
    <div>Mon</div>
    <div>Tue</div>
    <div>Wed</div>
    <div>Thu</div>
    <div>Fri</div>
    <div>Sat</div>
  </div>
  <div class="grid">
    {#each daysInGrid as dayItem}
      <div class="day"
           class:not-current-month={!dayItem.isCurrentMonth}
           class:today={isToday(dayItem.date) && dayItem.isCurrentMonth}
           on:click={() => dayItem.isCurrentMonth && openEventForm(dayItem.date)}
           title={dayItem.isCurrentMonth ? "Click to add event" : ""}>
        <div class="day-number">{dayItem.date.getDate()}</div>
        {#if dayItem.isCurrentMonth}
          <div class="events">
            {#each getEventsForDate(dayItem.date, $eventStore) as event (event.id)}
              <div class="event">{event.title}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .calendar {
    max-width: 100%; /* Use full width available */
    margin: 20px auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    border: 1px solid #e0e0e0; /* Lighter border for the calendar */
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
  }
  .header h2 {
    font-size: 1.3em; /* Adjusted size */
    font-weight: 500; /* Medium weight */
    margin: 0;
    color: #212529; /* Darker text */
  }
  .header button {
    padding: 6px 10px; /* Slightly smaller padding */
    font-size: 0.9em;
    background-color: #fff;
    border: 1px solid #ced4da; /* Standard bootstrap-like border */
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
  }
  .header button:hover {
    background-color: #e9ecef; /* Lighter hover */
    border-color: #adb5bd;
  }
  .header button:active {
    background-color: #dee2e6; /* Darker active state */
  }

  .days-of-week, .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
  }
  .days-of-week div {
    font-weight: 500; /* Medium weight for day names */
    padding: 12px 0; /* Adjusted padding */
    color: #495057; /* Subtler color for day names */
    font-size: 0.85em;
    background-color: #f8f9fa; /* Match header background */
    border-bottom: 1px solid #e0e0e0;
  }
  .grid { /* Remove outer padding from grid itself, cell will handle it */
    border-top: none; /* Remove double border with days-of-week */
  }
  .day { /* Renamed from .grid div for clarity and combined styles */
    padding: 10px; /* Adjusted padding */
    border: 1px solid #f1f1f1; /* Lighter internal borders */
    min-height: 100px; /* Adjusted min-height */
    position: relative; /* For event positioning if needed later */
    transition: background-color 0.2s;
  }
  .not-current-month {
    color: #aaa;
    background-color: #f9f9f9;
  }
  .today {
    background-color: #e6f7ff;
    font-weight: bold;
    border: 1px solid #91d5ff;
  }
  .day-number {
    font-size: 0.85em; /* Slightly smaller day number */
    margin-bottom: 6px; /* Increased margin */
    color: #333; /* Darker day number */
    text-align: left; /* Align day number to the left */
    padding-left: 4px; /* Small padding for day number */
  }
  .events {
    font-size: 0.7em; /* Smaller event font */
    text-align: left; /* Align event text to left */
  }
  .event {
    background-color: #007bff; /* Bootstrap primary blue for events */
    color: white; /* White text for events */
    padding: 3px 5px; /* Adjusted padding */
    border-radius: 3px;
    margin-bottom: 3px; /* Increased margin */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3; /* Improved line height */
  }

  /* Event Form Modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    z-index: 999;
  }
  .event-form-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 300px;
  }
  .event-form-modal h3 {
    margin-top: 0;
    margin-bottom: 15px;
  }
  .event-form-modal label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  .event-form-modal input[type="text"],
  .event-form-modal input[type="date"] {
    width: 100%; /* Use full width with box-sizing */
    padding: 10px; /* Increased padding */
    margin-bottom: 15px;
    border: 1px solid #ced4da; /* Consistent border */
    border-radius: 4px;
    box-sizing: border-box; /* Include padding and border in element's total width and height */
    font-size: 0.95em;
  }
  .form-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px; /* Add margin above buttons */
  }
  .form-buttons button {
    padding: 10px 18px; /* Increased padding */
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500; /* Medium weight for button text */
    transition: background-color 0.2s, box-shadow 0.2s;
  }
  .form-buttons button:first-child { /* Add Event button */
    background-color: #007bff; /* Primary blue */
    color: white;
  }
  .form-buttons button:first-child:hover {
    background-color: #0056b3; /* Darker blue on hover */
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .form-buttons button:last-child { /* Cancel button */
    background-color: #6c757d; /* Secondary gray */
    color: white;
  }
  .form-buttons button:last-child:hover {
    background-color: #545b62; /* Darker gray on hover */
  }

  .day:hover:not(.not-current-month) { /* Apply hover only to current month days */
    background-color: #e9ecef; /* Light gray hover for current month days */
    cursor: pointer;
  }
  /* Ensure not-current-month styles are not overridden by general day hover */
  .day.not-current-month:hover {
    background-color: #f9f9f9;
    cursor: default;
  }
</style>

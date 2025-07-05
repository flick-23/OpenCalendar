import { writable } from 'svelte/store';

const initialEvents = [
  // Example event:
  // {
  //   id: 1,
  //   date: new Date(2024, 6, 20), // Note: Month is 0-indexed (6 = July)
  //   title: 'Team Meeting'
  // }
];

export const events = writable(initialEvents);

export function addEvent(event) {
  events.update(currentEvents => {
    const newEvent = {
      ...event,
      id: currentEvents.length > 0 ? Math.max(...currentEvents.map(e => e.id)) + 1 : 1,
      date: new Date(event.date) // Ensure date is a Date object
    };
    return [...currentEvents, newEvent];
  });
}

// Function to get events for a specific day
export function getEventsForDate(date, allEvents) {
  return allEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getFullYear() === date.getFullYear() &&
           eventDate.getMonth() === date.getMonth() &&
           eventDate.getDate() === date.getDate();
  });
}

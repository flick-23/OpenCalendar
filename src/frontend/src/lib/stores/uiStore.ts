import { writable, type Writable } from 'svelte/store';

// Define the type for an event that might be edited or viewed in a modal
// This should align with the `Event` type from your backend `types.mo`
// and potentially `calendarStore.ts`
interface ModalEventData {
  id?: string | number | bigint; // Support string (from UI), number, or bigint (from backend)
  title?: string;
  description?: string;
  startTime?: Date; // Using Date objects on the frontend for easier manipulation
  endTime?: Date;
  color?: string;
  calendarId?: string | number; // Or your CalendarId type
  // Add any other fields your event modal might need
}

interface UiState {
  isEventModalOpen: boolean;
  selectedDay: Date | null; // For which day the modal might be opening
  eventModalData: ModalEventData | null; // Data for the event being edited/created
  // Add other UI states as needed, e.g., isSidebarOpen, currentView ('month', 'week', 'day')
  currentCalendarViewDate: Date; // The date the main calendar is centered on (e.g., for month view, the month shown)
}

const initialState: UiState = {
  isEventModalOpen: false,
  selectedDay: null,
  eventModalData: null,
  currentCalendarViewDate: new Date(),
};

export const uiStore: Writable<UiState> & {
  openEventModal: (eventData?: ModalEventData | null, day?: Date | null) => void;
  closeEventModal: () => void;
  setSelectedDay: (day: Date | null) => void;
  setCurrentCalendarViewDate: (date: Date) => void;
} = (() => {
  const store = writable<UiState>(initialState);

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    openEventModal: (eventData: ModalEventData | null = null, day: Date | null = null) => {
      store.update(state => ({
        ...state,
        isEventModalOpen: true,
        eventModalData: eventData, // If null, it's a new event
        selectedDay: eventData?.startTime ? new Date(eventData.startTime) : day ?? state.selectedDay ?? new Date()
      }));
    },

    closeEventModal: () => {
      store.update(state => ({
        ...state,
        isEventModalOpen: false,
        eventModalData: null,
        // selectedDay: null, // Optionally reset selected day or keep it
      }));
    },

    setSelectedDay: (day: Date | null) => {
      store.update(state => ({ ...state, selectedDay: day }));
    },

    setCurrentCalendarViewDate: (date: Date) => {
      store.update(state => ({ ...state, currentCalendarViewDate: date }));
    }
  };
})();

// Example usage:
// import { uiStore } from '$lib/stores/uiStore';
// uiStore.openEventModal({ title: 'My new Event' }, new Date()); // Open modal for new event on a specific day
// uiStore.closeEventModal();
// uiStore.setSelectedDay(new Date());
// uiStore.setCurrentCalendarViewDate(new Date(2024, 11, 1)); // Set calendar to Dec 2024

// To react to changes in Svelte components:
// $: isOpen = $uiStore.isEventModalOpen;
// $: selectedDate = $uiStore.selectedDay;
// $: currentView = $uiStore.currentCalendarViewDate;
//
// const handleMonthChange = (newMonthDate) => {
//   uiStore.setCurrentCalendarViewDate(newMonthDate);
// }
//
// In a Day component, on click:
// uiStore.openEventModal(null, dayObject.date); // Open for new event on this day
//
// In Month component, when an existing event is clicked:
// uiStore.openEventModal(transformBackendEventToModalData(eventDetails));
//
// function transformBackendEventToModalData(backendEvent: BackendEvent): ModalEventData {
//   return {
//     id: backendEvent.id,
//     title: backendEvent.title,
//     description: backendEvent.description,
//     startTime: new Date(Number(backendEvent.startTime) / 1_000_000), // nanoseconds to ms
//     endTime: new Date(Number(backendEvent.endTime) / 1_000_000),     // nanoseconds to ms
//     color: backendEvent.color,
//     calendarId: backendEvent.calendarId,
//   };
// }

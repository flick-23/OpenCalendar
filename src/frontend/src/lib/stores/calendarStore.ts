import { writable, type Writable, get } from 'svelte/store';
import { authStore } from '$lib/stores/authStore'; // Fixed import
import { createActor } from '$lib/actors/actors'; // Assuming this is the correct path
import type { ActorSubclass, Identity } from '@dfinity/agent';

// Import IDL, canister ID, and types from generated declarations
import {
    idlFactory as calendarCanisterIdlFactory,
    canisterId as actualCalendarCanisterId
} from '$declarations/calendar_canister_1';
import type {
    _SERVICE as CalendarServiceType,
    Event as BackendEventType,
    // Calendar as BackendCalendarType // Uncomment if your .did file defines a Calendar type
} from '$declarations/calendar_canister_1/calendar_canister_1.did';

// Type alias for IDs used in AppEvent and AppCalendar for clarity.
// Backend uses Nat (bigint), frontend might use number or string for convenience.
// We will need to convert these when calling actor methods.
type AppId = bigint | number | string;


// Frontend Event type
export interface AppEvent {
  id: AppId; // Nat on backend (bigint)
  calendarId: AppId; // Nat on backend (bigint)
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
}

// Frontend Calendar type (if managed by this store)
export interface AppCalendar {
  id: AppId; // Nat on backend (bigint)
  owner: string; // Principal text
  name: string;
  color: string;
}

// Helper to convert AppId to bigint for backend calls
const toBackendId = (id: AppId): bigint => {
    if (typeof id === 'bigint') return id;
    if (typeof id === 'string') return BigInt(id);
    return BigInt(id);
};


interface CalendarState {
  events: AppEvent[];
  calendars: AppCalendar[];
  isLoading: boolean;
  error: string | null;
  selectedCalendarId: AppId | null;
}

const initialState: CalendarState = {
  events: [],
  calendars: [
    { id: 1n, owner: 'system-mock', name: 'My Default Calendar', color: 'blue' } // Using bigint for mock ID
  ],
  isLoading: false,
  error: null,
  selectedCalendarId: 1n, // Default to the first calendar's ID
};

// Transform backend event (uses bigint for time) to frontend AppEvent (uses Date)
const transformBackendEventToAppEvent = (backendEvent: BackendEventType): AppEvent => {
  return {
    ...backendEvent,
    // Ensure IDs from backend (bigint) are directly usable or converted if needed for AppEvent.id
    // If AppEvent.id must be string/number, convert here: id: String(backendEvent.id)
    id: backendEvent.id, // Assuming AppEvent.id can be bigint
    calendarId: backendEvent.calendar_id, // field name from .did
    startTime: new Date(Number(backendEvent.start_time / 1000000n)), // Nanoseconds to milliseconds
    endTime: new Date(Number(backendEvent.end_time / 1000000n)),     // Nanoseconds to milliseconds
    // description and color should map directly if names are the same
  };
};

// Props for creating a new event, matching backend structure minus 'id'
// This is based on a common structure for create_event: (title, description, startTime, endTime, color, calendarId)
// Adjust if your `create_event` in .did expects a single record object.
type CreateEventParams = Omit<BackendEventType, 'id'>;


export const calendarStore: Writable<CalendarState> & {
  fetchEvents: (calendarId: AppId, start: Date, end: Date) => Promise<void>;
  createEvent: (eventData: Omit<AppEvent, 'id'>) => Promise<AppEvent | null>;
  updateEvent: (eventId: AppId, eventData: Partial<Omit<AppEvent, 'id' | 'calendarId'>>) => Promise<AppEvent | null>;
  deleteEvent: (eventId: AppId) => Promise<boolean>;
  setSelectedCalendar: (calendarId: AppId) => void;
  // TODO: Add methods for fetching/managing calendars if applicable
} = (() => {
  const store = writable<CalendarState>(initialState);
  let actor: ActorSubclass<CalendarServiceType> | null = null;

  const getCalendarActor = async (): Promise<ActorSubclass<CalendarServiceType> | null> => {
    if (actor) return actor; // Return cached actor if already created

    const currentAuth = get(authStore);
    if (!currentAuth.identity) {
      store.update(s => ({ ...s, error: "User not authenticated" }));
      return null;
    }
    try {
      actor = await createActor<CalendarServiceType>(
        actualCalendarCanisterId as string, // canisterId from $declarations
        calendarCanisterIdlFactory,      // idlFactory from $declarations
        currentAuth.identity
      );
      return actor;
    } catch (err) {
      console.error("Failed to create calendar actor:", err);
      store.update(s => ({ ...s, error: "Failed to connect to calendar service" }));
      return null;
    }
  };

  // Reset actor if identity changes (e.g., logout)
  authStore.subscribe(auth => {
    if (!auth.identity) {
      actor = null;
    }
  });


  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    setSelectedCalendar: (calendarId: AppId) => {
      store.update(s => ({ ...s, selectedCalendarId: calendarId }));
      // Consider fetching events for the new calendar here
    },

    fetchEvents: async (calendarId: AppId, start: Date, end: Date) => {
      store.update(s => ({ ...s, isLoading: true, error: null }));
      const currentActor = await getCalendarActor();
      if (!currentActor) {
        store.update(s => ({ ...s, isLoading: false, error: "Actor not available" }));
        return;
      }

      try {
        const startTimeNano = BigInt(start.getTime()) * 1000000n;
        const endTimeNano = BigInt(end.getTime()) * 1000000n;
        const backendCalendarId = toBackendId(calendarId);

        console.log(`Fetching events for calendar ${backendCalendarId} from ${start.toISOString()} to ${end.toISOString()}`);
        // Assuming get_events_for_range takes (calendarId: nat, start_time: int, end_time: int)
        const backendEvents = await currentActor.get_events_for_range(backendCalendarId, startTimeNano, endTimeNano);

        const appEvents = backendEvents.map(transformBackendEventToAppEvent);
        store.update(s => ({ ...s, events: appEvents, isLoading: false }));
      } catch (err: any) {
        console.error("Error fetching events:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to fetch events", isLoading: false }));
      }
    },

    createEvent: async (eventData: Omit<AppEvent, 'id'>) => {
      store.update(s => ({ ...s, isLoading: true, error: null }));
      const currentActor = await getCalendarActor();
      if (!currentActor) {
        store.update(s => ({ ...s, isLoading: false, error: "Actor not available" }));
        return null;
      }

      try {
        // Ensure eventData.calendarId is AppId and convert to bigint
        const backendCalendarId = toBackendId(eventData.calendarId);

        const params: CreateEventParams = {
          calendar_id: backendCalendarId,
          title: eventData.title,
          description: eventData.description,
          start_time: BigInt(eventData.startTime.getTime()) * 1000000n,
          end_time: BigInt(eventData.endTime.getTime()) * 1000000n,
          color: eventData.color,
          // Ensure all fields required by BackendEventType (excluding 'id') are present
        };
        console.log("Creating event with params:", params);
        // Assuming create_event takes an object matching CreateEventParams
        const backendEvent = await currentActor.create_event(params);

        const newAppEvent = transformBackendEventToAppEvent(backendEvent);
        store.update(s => ({
          ...s,
          events: [...s.events, newAppEvent],
          isLoading: false
        }));
        return newAppEvent;
      } catch (err: any) {
        console.error("Error creating event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to create event", isLoading: false }));
        return null;
      }
    },

    updateEvent: async (eventId: AppId, eventData: Partial<Omit<AppEvent, 'id' | 'calendarId'>>) => {
      store.update(s => ({ ...s, isLoading: true, error: null }));
      const currentActor = await getCalendarActor();
      if (!currentActor) {
        store.update(s => ({ ...s, isLoading: false, error: "Actor not available" }));
        return null;
      }

      try {
        // Construct the partial backend event data.
        // The backend `update_event` likely takes (eventId: nat, updates: record)
        // `updates` should only contain fields that are actually changing.
        const backendUpdates: Partial<Omit<BackendEventType, 'id' | 'calendar_id'>> = {};
        if (eventData.title !== undefined) backendUpdates.title = eventData.title;
        if (eventData.description !== undefined) backendUpdates.description = eventData.description;
        if (eventData.startTime !== undefined) backendUpdates.start_time = BigInt(eventData.startTime.getTime()) * 1000000n;
        if (eventData.endTime !== undefined) backendUpdates.end_time = BigInt(eventData.endTime.getTime()) * 1000000n;
        if (eventData.color !== undefined) backendUpdates.color = eventData.color;

        const backendEventId = toBackendId(eventId);

        console.log(`Updating event ${backendEventId} with data:`, backendUpdates);
        // Assuming update_event takes (eventId: nat, updates: YourPartialBackendEventRecord)
        // The exact structure of `backendUpdates` needs to match what `update_event` expects.
        // If it expects all optional fields, this is fine.
        const updatedBackendEvent = await currentActor.update_event(backendEventId, backendUpdates);

        const updatedAppEvent = transformBackendEventToAppEvent(updatedBackendEvent);
        store.update(s => ({
          ...s,
          events: s.events.map(e => (toBackendId(e.id)) === backendEventId ? updatedAppEvent : e),
          isLoading: false
        }));
        return updatedAppEvent;
      } catch (err: any) {
        console.error("Error updating event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to update event", isLoading: false }));
        return null;
      }
    },

    deleteEvent: async (eventId: AppId) => {
      store.update(s => ({ ...s, isLoading: true, error: null }));
      const currentActor = await getCalendarActor();
      if (!currentActor) {
        store.update(s => ({ ...s, isLoading: false, error: "Actor not available" }));
        return false;
      }

      try {
        const backendEventId = toBackendId(eventId);
        console.log(`Deleting event ${backendEventId}`);
        const success = await currentActor.delete_event(backendEventId);

        if (success) {
          store.update(s => ({
            ...s,
            events: s.events.filter(e => toBackendId(e.id) !== backendEventId),
            isLoading: false
          }));
        } else {
          // This case might not be reachable if backend throws error on failure
          store.update(s => ({ ...s, error: "Failed to delete event on backend (returned false)", isLoading: false }));
        }
        return success;
      } catch (err: any) {
        console.error("Error deleting event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to delete event", isLoading: false }));
        return false;
      }
    }
  };
})();

// Remove mock data initialization or make it strictly conditional if needed for dev
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') { ... }

// Remove or adjust auto-fetch logic as it might rely on uiStore which is not defined here
// authStore.subscribe(...)
// uiStore.subscribe(...)

console.log("calendarStore.ts updated to use actual canister declarations and actor calls.");

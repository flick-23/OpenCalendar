import { writable, type Writable, get } from 'svelte/store';
import { identity as authIdentity, isLoggedIn as authIsLoggedIn } from '$lib/stores/authStore';
import { createActor, getUserRegistryActor } from '$lib/actors/actors'; // Assuming this is the correct path
import type { ActorSubclass, Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

// Import IDL, canister ID, and types from generated declarations
import {
    idlFactory as calendarCanisterIdlFactory,
    canisterId as actualCalendarCanisterId
} from '$declarations/calendar_canister_1';
import type {
    _SERVICE as CalendarCanisterService, // Renamed for clarity
    Event as BackendCalendarEvent,  // Renamed for clarity
    CalendarId as BackendCalendarId, // explicit import
    Timestamp as BackendTimestamp, // explicit import
    EventId as BackendEventId // explicit import
} from '$declarations/calendar_canister_1/calendar_canister_1.did';

import type {
    Calendar as UserRegistryCalendar,
    _SERVICE as UserRegistryService
} from '$declarations/user_registry/user_registry.did';


// Type alias for IDs used in AppEvent and AppCalendar for clarity.
// Backend uses Nat (bigint), frontend might use number or string for convenience.
// We will need to convert these when calling actor methods.
type AppId = bigint; // Keep as bigint to align with backend, conversion at UI boundary if needed


// Frontend Event type
export interface AppEvent {
  id: AppId;
  calendarId: AppId;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
}

// Frontend Calendar type - maps to UserRegistryCalendar
export interface AppCalendar {
  id: AppId;
  owner: Principal; // Store as Principal object
  name: string;
  color: string;
}

// Helper to convert AppId to bigint for backend calls (already aligning AppId with bigint)
// const toBackendId = (id: AppId): bigint => id; // Not strictly needed if AppId is always bigint


interface CalendarState {
  events: AppEvent[];
  calendars: AppCalendar[]; // This will hold UserRegistryCalendar transformed to AppCalendar
  isLoadingEvents: boolean;
  isLoadingCalendars: boolean;
  error: string | null;
  selectedCalendarId: AppId | null;
}

const initialState: CalendarState = {
  events: [],
  calendars: [], // Initialize as empty, will be fetched
  isLoadingEvents: false,
  isLoadingCalendars: false,
  error: null,
  selectedCalendarId: null, // No default selection until calendars are fetched
};

// Transform backend event (uses bigint for time) to frontend AppEvent (uses Date)
const transformBackendEventToAppEvent = (backendEvent: BackendCalendarEvent): AppEvent => {
  return {
    id: backendEvent.id,
    calendarId: backendEvent.calendarId, // Corrected field name
    title: backendEvent.title,
    description: backendEvent.description,
    startTime: new Date(Number(backendEvent.startTime / 1000000n)), // Nanoseconds to milliseconds
    endTime: new Date(Number(backendEvent.endTime / 1000000n)),     // Nanoseconds to milliseconds
    color: backendEvent.color,
  };
};

const transformUserRegistryCalendarToAppCalendar = (ucCalendar: UserRegistryCalendar): AppCalendar => {
    return {
        id: ucCalendar.id, // Assuming UserRegistryCalendar.id is bigint
        owner: ucCalendar.owner, // Assuming UserRegistryCalendar.owner is Principal
        name: ucCalendar.name,
        color: ucCalendar.color,
    };
};


export const calendarStore: Writable<CalendarState> & {
  fetchUserCalendars: () => Promise<void>;
  createNewUserCalendar: (name: string, color: string) => Promise<AppCalendar | null>;
  setSelectedCalendar: (calendarId: AppId) => void;
  fetchEvents: (calendarId: AppId, start: Date, end: Date) => Promise<void>;
  createEvent: (eventData: Omit<AppEvent, 'id'>) => Promise<AppEvent | null>;
  updateEvent: (eventId: AppId, eventData: Partial<Omit<AppEvent, 'id' | 'calendarId'>>) => Promise<AppEvent | null>;
  deleteEvent: (eventId: AppId) => Promise<boolean>;
} = (() => {
  const store = writable<CalendarState>(initialState);
  let calendarCanisterActor: ActorSubclass<CalendarCanisterService> | null = null;
  let userRegistryActor: ActorSubclass<UserRegistryService> | null = null;

  const getCalendarCanisterActor = async (): Promise<ActorSubclass<CalendarCanisterService> | null> => {
    if (calendarCanisterActor) return calendarCanisterActor;

    const currentIdentity = get(authIdentity);
    if (!currentIdentity) {
      store.update(s => ({ ...s, error: "User not authenticated for calendar operations" }));
      return null;
    }
    try {
        calendarCanisterActor = await createActor<CalendarCanisterService>(
        actualCalendarCanisterId as string,
        calendarCanisterIdlFactory,
        currentIdentity
      );
      return calendarCanisterActor;
    } catch (err) {
      console.error("Failed to create calendar canister actor:", err);
      store.update(s => ({ ...s, error: "Failed to connect to calendar service" }));
      return null;
    }
  };

  const getUserRegistryActorInstance = async (): Promise<ActorSubclass<UserRegistryService> | null> => {
    if (userRegistryActor) return userRegistryActor;

    const currentIdentity = get(authIdentity);
    if (!currentIdentity) {
      store.update(s => ({ ...s, error: "User not authenticated for user registry operations" }));
      return null;
    }
    try {
        // Note: getUserRegistryActor is already defined in actors.ts, we should use that.
        // This is a temporary local definition for clarity if actors.ts wasn't available.
        // Re-using the one from actors.ts is preferred.
        userRegistryActor = await getUserRegistryActor(currentIdentity);
      return userRegistryActor;
    } catch (err) {
      console.error("Failed to create user registry actor:", err);
      store.update(s => ({ ...s, error: "Failed to connect to user registry service" }));
      return null;
    }
  };


  // Reset actors if identity changes (e.g., logout)
  authIdentity.subscribe(identity => {
    if (!identity) {
        calendarCanisterActor = null;
        userRegistryActor = null;
        // Clear store on logout
        store.set(initialState);
    } else {
        // Optional: Auto-fetch user calendars when identity is available and user is logged in
        if (get(authIsLoggedIn)) {
            // This might be called multiple times if authIsLoggedIn updates separately.
            // Consider a more robust trigger after full login sequence.
            methods.fetchUserCalendars();
        }
    }
  });

  const methods = {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    fetchUserCalendars: async (): Promise<void> => {
        store.update(s => ({ ...s, isLoadingCalendars: true, error: null }));
        const urActor = await getUserRegistryActorInstance();
        if (!urActor) {
            store.update(s => ({ ...s, isLoadingCalendars: false, error: "User Registry actor not available" }));
            return;
        }
        try {
            console.log('Fetching user calendars from UserRegistry...');
            const backendCalendars = await urActor.get_my_calendars();
            const appCalendars = backendCalendars.map(transformUserRegistryCalendarToAppCalendar);
            store.update(s => ({ ...s, calendars: appCalendars, isLoadingCalendars: false }));
            console.log('User calendars fetched:', appCalendars);

            if (appCalendars.length > 0) {
                const currentSelectedId = get(store).selectedCalendarId;
                const isValidSelection = appCalendars.some(cal => cal.id === currentSelectedId);
                if (!currentSelectedId || !isValidSelection) {
                    console.log('Auto-selecting first calendar:', appCalendars[0].id);
                    store.update(s => ({ ...s, selectedCalendarId: appCalendars[0].id! }));
                     // Fetch events for the auto-selected calendar
                    methods.fetchEvents(appCalendars[0].id!, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
                }
            } else {
                store.update(s => ({ ...s, selectedCalendarId: null, events: [] })); // No calendars, clear events
            }
        } catch (err: any) {
            console.error("Error fetching user calendars:", err);
            store.update(s => ({ ...s, error: err.message || "Failed to fetch user calendars", isLoadingCalendars: false }));
        }
    },

    createNewUserCalendar: async (name: string, color: string): Promise<AppCalendar | null> => {
        store.update(s => ({ ...s, isLoadingCalendars: true, error: null }));
        const urActor = await getUserRegistryActorInstance();
        if (!urActor) {
            store.update(s => ({ ...s, isLoadingCalendars: false, error: "User Registry actor not available" }));
            return null;
        }
        try {
            const newBackendCalendar = await urActor.create_calendar(name, color);
            const newAppCalendar = transformUserRegistryCalendarToAppCalendar(newBackendCalendar);
            // store.update(s => ({ ...s, calendars: [...s.calendars, newAppCalendar], isLoadingCalendars: false }));
            // After creating, refresh all calendars to ensure consistency and selection logic
            await methods.fetchUserCalendars();
            // Optionally, select the new calendar
            store.update(s => ({...s, selectedCalendarId: newAppCalendar.id}));
            methods.fetchEvents(newAppCalendar.id!, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
            return newAppCalendar;
        } catch (err: any) {
            console.error("Error creating new user calendar:", err);
            store.update(s => ({ ...s, error: err.message || "Failed to create new calendar", isLoadingCalendars: false }));
            return null;
        }
    },

    setSelectedCalendar: (calendarId: AppId) => {
      store.update(s => ({ ...s, selectedCalendarId: calendarId, events: [] /* Clear events when calendar changes */ }));
      // Fetch events for the new calendar. Define a default range or get from UI state.
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      methods.fetchEvents(calendarId, startOfMonth, endOfMonth);
    },

    fetchEvents: async (calendarId: AppId, start: Date, end: Date) => {
      if (!calendarId) {
        store.update(s => ({ ...s, events: [], error: "No calendar selected to fetch events for."}));
        return;
      }
      store.update(s => ({ ...s, isLoadingEvents: true, error: null }));
      const ccActor = await getCalendarCanisterActor();
      if (!ccActor) {
        store.update(s => ({ ...s, isLoadingEvents: false, error: "Calendar Canister actor not available" }));
        return;
      }

      try {
        const startTimeNano = BigInt(start.getTime()) * 1000000n;
        const endTimeNano = BigInt(end.getTime()) * 1000000n;

        console.log(`Fetching events for calendar ${calendarId} from ${start.toISOString()} to ${end.toISOString()}`);
        const backendEvents = await ccActor.get_events_for_range(calendarId, startTimeNano, endTimeNano);

        const appEvents = backendEvents.map(transformBackendEventToAppEvent);
        store.update(s => ({ ...s, events: appEvents, isLoadingEvents: false }));
      } catch (err: any) {
        console.error("Error fetching events:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to fetch events", isLoadingEvents: false }));
      }
    },

    createEvent: async (eventData: Omit<AppEvent, 'id'>): Promise<AppEvent | null> => {
      store.update(s => ({ ...s, isLoadingEvents: true, error: null }));
      const ccActor = await getCalendarCanisterActor();
      if (!ccActor) {
        store.update(s => ({ ...s, isLoadingEvents: false, error: "Calendar Canister actor not available" }));
        return null;
      }

      try {
        const backendCalendarId = eventData.calendarId; // Already AppId (bigint)
        const title = eventData.title;
        const description = eventData.description;
        const startTimeNano = BigInt(eventData.startTime.getTime()) * 1000000n;
        const endTimeNano = BigInt(eventData.endTime.getTime()) * 1000000n;
        const color = eventData.color;

        console.log("Creating event with params:", backendCalendarId, title, description, startTimeNano, endTimeNano, color);
        const backendEvent = await ccActor.create_event(
            backendCalendarId,
            title,
            description,
            startTimeNano,
            endTimeNano,
            color
        );

        const newAppEvent = transformBackendEventToAppEvent(backendEvent);
        store.update(s => ({
          ...s,
          events: [...s.events, newAppEvent].sort((a,b) => a.startTime.getTime() - b.startTime.getTime()), // Keep sorted
          isLoadingEvents: false
        }));
        return newAppEvent;
      } catch (err: any) {
        console.error("Error creating event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to create event", isLoadingEvents: false }));
        return null;
      }
    },

    updateEvent: async (eventId: AppId, eventData: Partial<Omit<AppEvent, 'id' | 'calendarId'>>): Promise<AppEvent | null> => {
      store.update(s => ({ ...s, isLoadingEvents: true, error: null }));
      const ccActor = await getCalendarCanisterActor();
      if (!ccActor) {
        store.update(s => ({ ...s, isLoadingEvents: false, error: "Calendar Canister actor not available" }));
        return null;
      }

      try {
        const newTitleOpt = eventData.title !== undefined ? [eventData.title] : [];
        const newDescriptionOpt = eventData.description !== undefined ? [eventData.description] : [];
        const newStartTimeOpt = eventData.startTime !== undefined ? [BigInt(eventData.startTime.getTime()) * 1000000n] : [];
        const newEndTimeOpt = eventData.endTime !== undefined ? [BigInt(eventData.endTime.getTime()) * 1000000n] : [];
        const newColorOpt = eventData.color !== undefined ? [eventData.color] : [];

        console.log(`Updating event ${eventId} with data:`, eventData);
        const result = await ccActor.update_event(
            eventId,
            newTitleOpt,
            newDescriptionOpt,
            newStartTimeOpt,
            newEndTimeOpt,
            newColorOpt
        );

        if (result.length > 0) {
            const updatedBackendEvent = result[0];
            const updatedAppEvent = transformBackendEventToAppEvent(updatedBackendEvent);
            store.update(s => ({
              ...s,
              events: s.events.map(e => e.id === eventId ? updatedAppEvent : e).sort((a,b) => a.startTime.getTime() - b.startTime.getTime()),
              isLoadingEvents: false
            }));
            return updatedAppEvent;
        } else {
            store.update(s => ({ ...s, error: "Failed to update event (no event returned)", isLoadingEvents: false }));
            return null;
        }
      } catch (err: any) {
        console.error("Error updating event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to update event", isLoadingEvents: false }));
        return null;
      }
    },

    deleteEvent: async (eventId: AppId): Promise<boolean> => {
      store.update(s => ({ ...s, isLoadingEvents: true, error: null }));
      const ccActor = await getCalendarCanisterActor();
      if (!ccActor) {
        store.update(s => ({ ...s, isLoadingEvents: false, error: "Calendar Canister actor not available" }));
        return false;
      }

      try {
        console.log(`Deleting event ${eventId}`);
        const success = await ccActor.delete_event(eventId);

        if (success) {
          store.update(s => ({
            ...s,
            events: s.events.filter(e => e.id !== eventId),
            isLoadingEvents: false
          }));
        } else {
          store.update(s => ({ ...s, error: "Failed to delete event on backend (returned false)", isLoadingEvents: false }));
        }
        return success;
      } catch (err: any) {
        console.error("Error deleting event:", err);
        store.update(s => ({ ...s, error: err.message || "Failed to delete event", isLoadingEvents: false }));
        return false;
      }
    }
  };
  return methods;
})();

// Remove mock data initialization or make it strictly conditional if needed for dev
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') { ... }

// Remove or adjust auto-fetch logic as it might rely on uiStore which is not defined here
// authStore.subscribe(...)
// uiStore.subscribe(...)

console.log("calendarStore.ts updated to use actual canister declarations and actor calls.");

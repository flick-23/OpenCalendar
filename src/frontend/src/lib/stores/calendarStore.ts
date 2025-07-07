/**
 * Calendar Store - Frontend State Management for Calendar Events
 * 
 * This store manages the client-side cache of event data and provides
 * functions to interact with the CalendarCanister backend.
 * 
 * Core Principle: The CalendarCanister is the single source of truth.
 * This store is just a cache for efficient UI rendering.
 */

import { writable, type Writable, get } from 'svelte/store';
import { identity as authIdentity } from '$lib/stores/authStore';
import { getCalendarCanisterActor } from '$lib/actors/actors';

// Import types from generated declarations
import type {
    _SERVICE as CalendarCanisterService,
    Event as BackendEvent
} from '$declarations/calendar_canister_1/calendar_canister_1.did';

// Frontend Event type (simplified, matches backend Event structure)
export interface Event {
  id: bigint;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  owner: string; // Principal as string for easier handling
}

// Legacy types for backward compatibility during transition
export type AppEvent = Event;
export type AppId = bigint;

// Store state interface
interface CalendarState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  lastFetchedRange: { start: Date; end: Date } | null; // Track the last fetched range
}

// Initial state
const initialState: CalendarState = {
  events: [],
  isLoading: false,
  error: null,
  lastFetchedRange: null
};

// Transform backend event (nanosecond timestamps) to frontend Event (Date objects)
function transformBackendEvent(backendEvent: BackendEvent): Event {
  return {
    id: backendEvent.id,
    title: backendEvent.title,
    description: backendEvent.description,
    startTime: new Date(Number(backendEvent.startTime / 1000000n)), // nanoseconds to milliseconds
    endTime: new Date(Number(backendEvent.endTime / 1000000n)), // nanoseconds to milliseconds
    color: backendEvent.color,
    owner: backendEvent.owner.toString()
  };
}

// Helper to get calendar canister actor instance
async function getCalendarActor(): Promise<CalendarCanisterService> {
  const identity = get(authIdentity);
  return getCalendarCanisterActor(identity);
}

// Create the store with methods
export const calendarStore: Writable<CalendarState> & {
  fetchEvents: (startTime: Date, endTime: Date) => Promise<void>;
  createEvent: (eventData: Omit<Event, 'id' | 'owner'>) => Promise<void>;
  updateEvent: (eventId: bigint, updates: Partial<Omit<Event, 'id' | 'owner'>>) => Promise<void>;
  deleteEvent: (eventId: bigint) => Promise<void>;
  clearCache: () => void;
} = (() => {
  const store = writable<CalendarState>(initialState);

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    /**
     * Fetches events for a given time range from the backend.
     * Intelligently merges with existing events to avoid redundant fetches.
     * 
     * @param startTime - Range start as Date object
     * @param endTime - Range end as Date object
     */
    fetchEvents: async (startTime: Date, endTime: Date): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        // Convert Date objects to nanosecond timestamps
        const startNano = BigInt(startTime.getTime()) * 1000000n;
        const endNano = BigInt(endTime.getTime()) * 1000000n;

        console.log(`Fetching events from ${startTime.toISOString()} to ${endTime.toISOString()}`);

        const actor = await getCalendarActor();
        const backendEvents = await actor.get_events_for_range(startNano, endNano);

        // Transform and sort events
        const newEvents = backendEvents
          .map(transformBackendEvent)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        console.log(`Fetched ${newEvents.length} events for range`);

        store.update(s => {
          // Create a map of existing events by ID for faster lookup
          const existingEventsMap = new Map(s.events.map(e => [e.id.toString(), e]));
          
          // Add new events, replacing any existing ones with the same ID
          newEvents.forEach(event => {
            existingEventsMap.set(event.id.toString(), event);
          });
          
          // Convert back to array and sort
          const allEvents = Array.from(existingEventsMap.values())
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          return {
            ...s,
            events: allEvents,
            isLoading: false,
            lastFetchedRange: { start: new Date(startTime), end: new Date(endTime) }
          };
        });

      } catch (error: unknown) {
        console.error('Error fetching events:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch events'
        }));
      }
    },

    /**
     * Creates a new event in the backend.
     * After successful creation, refreshes the events list to ensure consistency.
     * 
     * @param eventData - Event data without id and owner (those are set by backend)
     */
    createEvent: async (eventData: Omit<Event, 'id' | 'owner'>): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        // Convert Date objects to nanosecond timestamps
        const startNano = BigInt(eventData.startTime.getTime()) * 1000000n;
        const endNano = BigInt(eventData.endTime.getTime()) * 1000000n;

        console.log('Creating event:', eventData);

        const actor = await getCalendarActor();
        const result = await actor.create_event(
          eventData.title,
          eventData.description,
          startNano,
          endNano,
          eventData.color
        );

        if ('ok' in result) {
          console.log('Event created successfully:', result.ok);
          
          // Add the new event to the current cache immediately
          const newEvent = transformBackendEvent(result.ok);
          
          store.update(s => ({
            ...s,
            events: [...s.events, newEvent].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
            isLoading: false
          }));
          
        } else {
          throw new Error(result.err);
        }

      } catch (error: unknown) {
        console.error('Error creating event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to create event'
        }));
      }
    },

    /**
     * Updates an existing event in the backend.
     * After successful update, refreshes the events list to ensure consistency.
     * 
     * @param eventId - ID of the event to update
     * @param updates - Partial event data to update
     */
    updateEvent: async (eventId: bigint, updates: Partial<Omit<Event, 'id' | 'owner'>>): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        console.log('Updating event:', eventId, updates);

        const actor = await getCalendarActor();
        
        // Convert Date objects to nanosecond timestamps if provided
        const startNano = updates.startTime ? BigInt(updates.startTime.getTime()) * 1000000n : null;
        const endNano = updates.endTime ? BigInt(updates.endTime.getTime()) * 1000000n : null;

        const result = await actor.update_event(
          eventId,
          updates.title ? [updates.title] : [],
          updates.description ? [updates.description] : [],
          startNano ? [startNano] : [],
          endNano ? [endNano] : [],
          updates.color ? [updates.color] : []
        );

        if ('ok' in result) {
          console.log('Event updated successfully:', result.ok);
          
          // Update the event in the current cache
          const updatedEvent = transformBackendEvent(result.ok);
          
          store.update(s => ({
            ...s,
            events: s.events.map(e => e.id === eventId ? updatedEvent : e).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
            isLoading: false
          }));
          
        } else {
          throw new Error(result.err);
        }

      } catch (error: unknown) {
        console.error('Error updating event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to update event'
        }));
      }
    },

    /**
     * Deletes an event from the backend.
     * After successful deletion, refreshes the events list to ensure consistency.
     * 
     * @param eventId - ID of the event to delete
     */
    deleteEvent: async (eventId: bigint): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        console.log('Deleting event:', eventId);

        const actor = await getCalendarActor();
        const result = await actor.delete_event(eventId);

        if ('ok' in result) {
          console.log('Event deleted successfully');
          
          // Remove the event from the current cache
          store.update(s => ({
            ...s,
            events: s.events.filter(e => e.id !== eventId),
            isLoading: false
          }));
          
        } else {
          throw new Error(result.err);
        }

      } catch (error: unknown) {
        console.error('Error deleting event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to delete event'
        }));
      }
    },

    /**
     * Clears the event cache and resets the store.
     * Useful for forcing a fresh fetch of events.
     */
    clearCache: (): void => {
      store.update(s => ({
        ...s,
        events: [],
        lastFetchedRange: null,
        error: null
      }));
    }
  };
})();

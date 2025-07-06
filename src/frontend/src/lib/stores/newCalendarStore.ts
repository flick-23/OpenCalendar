// src/frontend/src/lib/stores/calendarStore.ts
import { writable, type Writable } from 'svelte/store';
import { getCalendarCanisterActor } from '$lib/actors/actors';
import type { ActorSubclass } from '@dfinity/agent';

// === TYPE DEFINITIONS ===

// Frontend Event type - matches the new CalendarCanister Event structure
export interface Event {
  id: bigint;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  owner: string; // Principal as string for easier handling in frontend
}

// Type for creating new events (omits id and owner as they're set by the backend)
export interface CreateEventData {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
}

// Type for updating events (all fields optional except id)
export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  color?: string;
}

// Store state interface
interface CalendarStoreState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  currentViewStart: Date | null; // Track the current view period for cache management
  currentViewEnd: Date | null;
}

// === BACKEND COMMUNICATION ===

// Transform backend event to frontend event
function transformBackendToFrontend(backendEvent: any): Event {
  return {
    id: backendEvent.id,
    title: backendEvent.title,
    description: backendEvent.description,
    startTime: new Date(Number(backendEvent.startTime / 1_000_000n)), // nanoseconds to milliseconds
    endTime: new Date(Number(backendEvent.endTime / 1_000_000n)),
    color: backendEvent.color,
    owner: backendEvent.owner.toString()
  };
}

// Transform frontend event data to backend format for creation
function transformCreateDataToBackend(eventData: CreateEventData) {
  return {
    title: eventData.title,
    description: eventData.description,
    startTime: BigInt(eventData.startTime.getTime()) * 1_000_000n, // milliseconds to nanoseconds
    endTime: BigInt(eventData.endTime.getTime()) * 1_000_000n,
    color: eventData.color
  };
}

// Transform frontend update data to backend format
function transformUpdateDataToBackend(updateData: UpdateEventData) {
  return {
    title: updateData.title !== undefined ? [updateData.title] : [],
    description: updateData.description !== undefined ? [updateData.description] : [],
    startTime: updateData.startTime !== undefined ? [BigInt(updateData.startTime.getTime()) * 1_000_000n] : [],
    endTime: updateData.endTime !== undefined ? [BigInt(updateData.endTime.getTime()) * 1_000_000n] : [],
    color: updateData.color !== undefined ? [updateData.color] : []
  };
}

// === STORE IMPLEMENTATION ===

const initialState: CalendarStoreState = {
  events: [],
  isLoading: false,
  error: null,
  currentViewStart: null,
  currentViewEnd: null
};

function createCalendarStore() {
  const { subscribe, update } = writable<CalendarStoreState>(initialState);

  return {
    subscribe,

    /**
     * Fetches events for a given time range from the backend.
     * This is the primary way to load events and should be called whenever
     * the user navigates to a different time period.
     * 
     * @param startTime - Start of the time range to fetch
     * @param endTime - End of the time range to fetch
     */
    async fetchEvents(startTime: Date, endTime: Date): Promise<void> {
      console.log(`[CalendarStore] Fetching events from ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const actor = await getCalendarCanisterActor();
        if (!actor) {
          throw new Error('Calendar canister actor not available');
        }

        // Convert dates to nanosecond timestamps
        const startTimeNanos = BigInt(startTime.getTime()) * 1_000_000n;
        const endTimeNanos = BigInt(endTime.getTime()) * 1_000_000n;

        console.log(`[CalendarStore] Calling get_events_for_range with timestamps: ${startTimeNanos} to ${endTimeNanos}`);
        
        // Call the new backend API
        const backendEvents = await actor.get_events_for_range(startTimeNanos, endTimeNanos);
        
        console.log(`[CalendarStore] Received ${backendEvents.length} events from backend`);

        // Transform backend events to frontend format
        const frontendEvents = backendEvents.map(transformBackendToFrontend);

        // Sort events by start time for consistent display
        frontendEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        update(state => ({
          ...state,
          events: frontendEvents,
          isLoading: false,
          currentViewStart: startTime,
          currentViewEnd: endTime
        }));

        console.log(`[CalendarStore] Successfully loaded ${frontendEvents.length} events`);

      } catch (error) {
        console.error('[CalendarStore] Error fetching events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
        
        update(state => ({
          ...state,
          error: errorMessage,
          isLoading: false
        }));
      }
    },

    /**
     * Creates a new event in the backend and refreshes the current view.
     * 
     * @param eventData - The event data to create
     * @returns Promise that resolves to the created event or null on error
     */
    async createEvent(eventData: CreateEventData): Promise<Event | null> {
      console.log('[CalendarStore] Creating new event:', eventData);
      
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const actor = await getCalendarCanisterActor();
        if (!actor) {
          throw new Error('Calendar canister actor not available');
        }

        // Transform and validate data
        const backendData = transformCreateDataToBackend(eventData);
        
        if (backendData.startTime >= backendData.endTime) {
          throw new Error('Event start time must be before end time');
        }

        console.log('[CalendarStore] Calling create_event with backend data:', backendData);

        // Call the new backend API
        const result = await actor.create_event(
          backendData.title,
          backendData.description,
          backendData.startTime,
          backendData.endTime,
          backendData.color
        );

        // Handle Result type from backend
        if ('ok' in result) {
          const createdEvent = transformBackendToFrontend(result.ok);
          console.log('[CalendarStore] Successfully created event:', createdEvent);

          // Refresh the current view to get the latest data
          update(state => {
            if (state.currentViewStart && state.currentViewEnd) {
              // Don't wait for the refresh to complete, just trigger it
              setTimeout(() => {
                calendarStore.fetchEvents(state.currentViewStart!, state.currentViewEnd!);
              }, 0);
            }
            return { ...state, isLoading: false };
          });

          return createdEvent;
        } else {
          throw new Error(result.err || 'Failed to create event');
        }

      } catch (error) {
        console.error('[CalendarStore] Error creating event:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
        
        update(state => ({
          ...state,
          error: errorMessage,
          isLoading: false
        }));

        return null;
      }
    },

    /**
     * Updates an existing event in the backend and refreshes the current view.
     * 
     * @param eventId - ID of the event to update
     * @param updateData - The fields to update
     * @returns Promise that resolves to the updated event or null on error
     */
    async updateEvent(eventId: bigint, updateData: UpdateEventData): Promise<Event | null> {
      console.log('[CalendarStore] Updating event:', eventId, updateData);
      
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const actor = await getCalendarCanisterActor();
        if (!actor) {
          throw new Error('Calendar canister actor not available');
        }

        // Transform update data to backend format
        const backendUpdateData = transformUpdateDataToBackend(updateData);
        
        console.log('[CalendarStore] Calling update_event with backend data:', backendUpdateData);

        // Call the new backend API
        const result = await actor.update_event(eventId, backendUpdateData);

        // Handle Result type from backend
        if ('ok' in result) {
          const updatedEvent = transformBackendToFrontend(result.ok);
          console.log('[CalendarStore] Successfully updated event:', updatedEvent);

          // Refresh the current view to get the latest data
          update(state => {
            if (state.currentViewStart && state.currentViewEnd) {
              setTimeout(() => {
                calendarStore.fetchEvents(state.currentViewStart!, state.currentViewEnd!);
              }, 0);
            }
            return { ...state, isLoading: false };
          });

          return updatedEvent;
        } else {
          throw new Error(result.err || 'Failed to update event');
        }

      } catch (error) {
        console.error('[CalendarStore] Error updating event:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
        
        update(state => ({
          ...state,
          error: errorMessage,
          isLoading: false
        }));

        return null;
      }
    },

    /**
     * Deletes an event from the backend and refreshes the current view.
     * 
     * @param eventId - ID of the event to delete
     * @returns Promise that resolves to true on success, false on error
     */
    async deleteEvent(eventId: bigint): Promise<boolean> {
      console.log('[CalendarStore] Deleting event:', eventId);
      
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const actor = await getCalendarCanisterActor();
        if (!actor) {
          throw new Error('Calendar canister actor not available');
        }

        console.log('[CalendarStore] Calling delete_event');

        // Call the new backend API
        const result = await actor.delete_event(eventId);

        // Handle Result type from backend
        if ('ok' in result && result.ok) {
          console.log('[CalendarStore] Successfully deleted event');

          // Refresh the current view to get the latest data
          update(state => {
            if (state.currentViewStart && state.currentViewEnd) {
              setTimeout(() => {
                calendarStore.fetchEvents(state.currentViewStart!, state.currentViewEnd!);
              }, 0);
            }
            return { ...state, isLoading: false };
          });

          return true;
        } else {
          throw new Error(result.err || 'Failed to delete event');
        }

      } catch (error) {
        console.error('[CalendarStore] Error deleting event:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
        
        update(state => ({
          ...state,
          error: errorMessage,
          isLoading: false
        }));

        return false;
      }
    },

    /**
     * Clears any error state.
     */
    clearError(): void {
      update(state => ({ ...state, error: null }));
    },

    /**
     * Gets the current state (useful for components that need immediate access).
     */
    getCurrentState(): CalendarStoreState {
      let currentState: CalendarStoreState = initialState;
      subscribe(state => currentState = state)();
      return currentState;
    }
  };
}

// Export the store instance
export const calendarStore = createCalendarStore();

// Export types for use in components
export type { CalendarStoreState };

console.log('[CalendarStore] Calendar store initialized with new event system');

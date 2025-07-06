/**
 * Events Store - Frontend State Management for Calendar Events
 * 
 * This store manages the client-side cache of event data and provides
 * functions to interact with the CalendarCanister backend.
 * 
 * Core Principle: The CalendarCanister is the single source of truth.
 * This store is just a cache for efficient UI rendering.
 */

import { writable, type Writable } from 'svelte/store';
import { identity as authIdentity } from '$lib/stores/authStore';
import { createActor } from '$lib/actors/actors';

// Import IDL and types from generated declarations
import {
    idlFactory as calendarCanisterIdlFactory,
    canisterId as calendarCanisterId
} from '$declarations/calendar_canister_1';
import type {
    _SERVICE as CalendarCanisterService,
    Event as BackendEvent,
    EventId as BackendEventId,
    Timestamp as BackendTimestamp
} from '$declarations/calendar_canister_1/calendar_canister_1.did';

// Frontend Event type (simplified, no calendarId needed for new system)
export interface Event {
  id: bigint;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  owner: string; // Principal as string for easier handling
}

// Store state interface
interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: EventsState = {
  events: [],
  isLoading: false,
  error: null
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
  const identity = authIdentity.get();
  return createActor(calendarCanisterIdlFactory, {
    canisterId: calendarCanisterId,
    agentOptions: { identity }
  }) as CalendarCanisterService;
}

// Create the store with methods
export const eventsStore: Writable<EventsState> & {
  fetchEvents: (startTime: Date, endTime: Date) => Promise<void>;
  createEvent: (eventData: Omit<Event, 'id' | 'owner'>) => Promise<void>;
  updateEvent: (eventId: bigint, updates: Partial<Omit<Event, 'id' | 'owner'>>) => Promise<void>;
  deleteEvent: (eventId: bigint) => Promise<void>;
} = (() => {
  const store = writable<EventsState>(initialState);

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    /**
     * Fetches events for a given time range from the backend.
     * Updates the store with the fetched events.
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
        const events = backendEvents
          .map(transformBackendEvent)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        console.log(`Fetched ${events.length} events`);

        store.update(s => ({
          ...s,
          events,
          isLoading: false
        }));

      } catch (error: any) {
        console.error('Error fetching events:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error.message || 'Failed to fetch events'
        }));
      }
    },

    /**
     * Creates a new event in the backend.
     * Refreshes the events list to ensure consistency.
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
          
          // Refresh events to get the latest state from the source of truth
          // This is simple and reliable - we fetch events for the current month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          
          // Re-fetch events (this will update isLoading state)
          const startNano = BigInt(startOfMonth.getTime()) * 1000000n;
          const endNano = BigInt(endOfMonth.getTime()) * 1000000n;
          
          const backendEvents = await actor.get_events_for_range(startNano, endNano);
          const events = backendEvents
            .map(transformBackendEvent)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          store.update(s => ({
            ...s,
            events,
            isLoading: false
          }));

        } else {
          throw new Error(result.err);
        }

      } catch (error: any) {
        console.error('Error creating event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error.message || 'Failed to create event'
        }));
      }
    },

    /**
     * Updates an existing event in the backend.
     * Refreshes the events list to ensure consistency.
     */
    updateEvent: async (eventId: bigint, updates: Partial<Omit<Event, 'id' | 'owner'>>): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        console.log('Updating event:', eventId, updates);

        const actor = await getCalendarActor();
        const result = await actor.update_event(
          eventId,
          updates.title ? [updates.title] : [],
          updates.description ? [updates.description] : [],
          updates.startTime ? [BigInt(updates.startTime.getTime()) * 1000000n] : [],
          updates.endTime ? [BigInt(updates.endTime.getTime()) * 1000000n] : [],
          updates.color ? [updates.color] : []
        );

        if ('ok' in result) {
          console.log('Event updated successfully:', result.ok);
          
          // Refresh events to get the latest state
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const startNano = BigInt(startOfMonth.getTime()) * 1000000n;
          const endNano = BigInt(endOfMonth.getTime()) * 1000000n;
          
          const backendEvents = await actor.get_events_for_range(startNano, endNano);
          const events = backendEvents
            .map(transformBackendEvent)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          store.update(s => ({
            ...s,
            events,
            isLoading: false
          }));

        } else {
          throw new Error(result.err);
        }

      } catch (error: any) {
        console.error('Error updating event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error.message || 'Failed to update event'
        }));
      }
    },

    /**
     * Deletes an event from the backend.
     * Refreshes the events list to ensure consistency.
     */
    deleteEvent: async (eventId: bigint): Promise<void> => {
      store.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        console.log('Deleting event:', eventId);

        const actor = await getCalendarActor();
        const result = await actor.delete_event(eventId);

        if ('ok' in result && result.ok) {
          console.log('Event deleted successfully');
          
          // Refresh events to get the latest state
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const startNano = BigInt(startOfMonth.getTime()) * 1000000n;
          const endNano = BigInt(endOfMonth.getTime()) * 1000000n;
          
          const backendEvents = await actor.get_events_for_range(startNano, endNano);
          const events = backendEvents
            .map(transformBackendEvent)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          store.update(s => ({
            ...s,
            events,
            isLoading: false
          }));

        } else {
          throw new Error('err' in result ? result.err : 'Failed to delete event');
        }

      } catch (error: any) {
        console.error('Error deleting event:', error);
        store.update(s => ({
          ...s,
          isLoading: false,
          error: error.message || 'Failed to delete event'
        }));
      }
    }
  };
})();

console.log('Events store initialized with new architecture');

import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Calendar {
  'id' : CalendarId,
  'owner' : Principal,
  'name' : string,
  'color' : string,
}
export type CalendarId = bigint;
export interface Event {
  'id' : EventId,
  'startTime' : Timestamp,
  'title' : string,
  'endTime' : Timestamp,
  'color' : string,
  'description' : string,
  'calendarId' : CalendarId,
}
export type EventId = bigint;
export type Principal = Principal;
export type Timestamp = bigint;
export interface _SERVICE {
  'create_calendar_internal' : ActorMethod<
    [Principal, string, string],
    Calendar
  >,
  'create_event' : ActorMethod<
    [CalendarId, string, string, Timestamp, Timestamp, string],
    Event
  >,
  'delete_event' : ActorMethod<[EventId], boolean>,
  'get_event' : ActorMethod<[EventId], [] | [Event]>,
  'get_events_for_range' : ActorMethod<
    [CalendarId, Timestamp, Timestamp],
    Array<Event>
  >,
  'update_event' : ActorMethod<
    [
      EventId,
      [] | [string],
      [] | [string],
      [] | [Timestamp],
      [] | [Timestamp],
      [] | [string],
    ],
    [] | [Event]
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

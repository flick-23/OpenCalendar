import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Event {
  'id' : EventId,
  'startTime' : Timestamp,
  'title' : string,
  'endTime' : Timestamp,
  'owner' : Principal,
  'color' : string,
  'description' : string,
}
export type EventId = bigint;
export type Principal = Principal;
export type Result = { 'ok' : Event } |
  { 'err' : string };
export type Result_1 = { 'ok' : boolean } |
  { 'err' : string };
export type Timestamp = bigint;
export interface _SERVICE {
  'create_event' : ActorMethod<
    [string, string, Timestamp, Timestamp, string],
    Result
  >,
  'delete_event' : ActorMethod<[EventId], Result_1>,
  'get_event' : ActorMethod<[EventId], [] | [Event]>,
  'get_events_for_range' : ActorMethod<[Timestamp, Timestamp], Array<Event>>,
  'get_stats' : ActorMethod<[], { 'totalEvents' : bigint }>,
  'update_event' : ActorMethod<
    [
      EventId,
      [] | [string],
      [] | [string],
      [] | [Timestamp],
      [] | [Timestamp],
      [] | [string],
    ],
    Result
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

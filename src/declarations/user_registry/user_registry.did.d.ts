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
export type Principal = Principal;
export interface UserProfile { 'principal' : Principal, 'name' : string }
export interface _SERVICE {
  'create_calendar' : ActorMethod<[string, string], Calendar>,
  'get_my_calendars' : ActorMethod<[], Array<Calendar>>,
  'get_my_profile' : ActorMethod<[], [] | [UserProfile]>,
  'register' : ActorMethod<[string], UserProfile>,
  'set_calendar_canister_id' : ActorMethod<[Principal], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

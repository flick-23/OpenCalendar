import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Principal = Principal;
export type Timestamp = bigint;
export interface _SERVICE {
  'send_event_reminder' : ActorMethod<[Principal, string, Timestamp], boolean>,
  'status' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

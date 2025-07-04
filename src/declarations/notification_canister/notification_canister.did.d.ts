import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type Principal = Principal;
export type Timestamp = bigint;
export interface _SERVICE {
  'send_event_reminder' : ActorMethod<[Principal, string, Timestamp], boolean>,
  'status' : ActorMethod<[], string>,
}

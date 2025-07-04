import { Actor, HttpAgent, type Identity, type ActorSubclass } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

// Import canister-specific declarations
import {
    idlFactory as userRegistryIdlFactory,
    canisterId as userRegistryCanisterId
} from '$declarations/user_registry';
import type { _SERVICE as UserRegistryService } from '$declarations/user_registry/user_registry.did';

import {
    idlFactory as calendarCanisterIdlFactory,
    canisterId as calendarCanisterId
} from '$declarations/calendar_canister_1';
import type { _SERVICE as CalendarCanisterService } from '$declarations/calendar_canister_1/calendar_canister_1.did';


/**
 * Creates an actor for interacting with a canister.
 * @param canisterId The ID of the canister to interact with.
 * @param idlFactory The IDL factory for the canister's interface.
 * @param identity Optional identity to use for authenticated calls.
 * @param host The host to connect to.
 * @returns An actor instance.
 */
export const createActor = async <T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory,
  identity?: Identity | null,
  host?: string
): Promise<ActorSubclass<T>> => {
  const currentHost = host || (process.env.DFX_NETWORK === 'ic'
    ? 'https://icp-api.io'
    : 'http://localhost:4943');

  const agent = new HttpAgent({
    host: currentHost,
    identity: identity || undefined,
  });

  if (process.env.DFX_NETWORK !== 'ic') {
    try {
      await agent.fetchRootKey();
    } catch (error) {
      console.warn('Unable to fetch root key. Ensure local replica is running or network is "ic".', error);
    }
  }

  const actor = Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });

  return actor;
};

export const getUserRegistryActor = async (identity?: Identity | null): Promise<ActorSubclass<UserRegistryService>> => {
    if (!userRegistryCanisterId) {
        throw new Error("User Registry Canister ID not found. Ensure it's in declarations or environment.");
    }
    // The canisterId from $declarations might be a string. createActor handles string canisterId.
    return createActor<UserRegistryService>(userRegistryCanisterId as string, userRegistryIdlFactory, identity);
};

export const getCalendarCanisterActor = async (identity?: Identity | null): Promise<ActorSubclass<CalendarCanisterService>> => {
    if (!calendarCanisterId) {
        throw new Error("Calendar Canister ID not found.");
    }
    // The canisterId from $declarations might be a string. createActor handles string canisterId.
    return createActor<CalendarCanisterService>(calendarCanisterId as string, calendarCanisterIdlFactory, identity);
};

console.log("actors.ts updated with specific canister imports and actor creation functions.");

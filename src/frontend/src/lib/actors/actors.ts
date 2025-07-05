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
  const currentHost = host || (import.meta.env.VITE_DFX_NETWORK === 'ic'
    ? 'https://icp-api.io'
    : 'http://127.0.0.1:8000');

  const agent = new HttpAgent({
    host: currentHost,
    identity: identity || undefined,
  });

  if (import.meta.env.VITE_DFX_NETWORK !== 'ic') {
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
    const canisterId = userRegistryCanisterId || import.meta.env.VITE_CANISTER_ID_USER_REGISTRY || 'ucwa4-rx777-77774-qaada-cai';
    
    console.log('getUserRegistryActor called with:', { 
        userRegistryCanisterId, 
        identity: identity ? 'present' : 'null',
        viteEnvUserRegistry: import.meta.env.VITE_CANISTER_ID_USER_REGISTRY,
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("User Registry Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("User Registry Canister ID not found. Ensure it's in declarations or environment.");
    }
    
    return createActor<UserRegistryService>(canisterId as string, userRegistryIdlFactory, identity);
};

export const getCalendarCanisterActor = async (identity?: Identity | null): Promise<ActorSubclass<CalendarCanisterService>> => {
    const canisterId = calendarCanisterId || import.meta.env.VITE_CANISTER_ID_CALENDAR_CANISTER_1 || 'uxrrr-q7777-77774-qaaaq-cai';
    
    console.log('getCalendarCanisterActor called with:', { 
        calendarCanisterId, 
        identity: identity ? 'present' : 'null',
        viteEnvCalendar: import.meta.env.VITE_CANISTER_ID_CALENDAR_CANISTER_1,
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Calendar Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Calendar Canister ID not found.");
    }
    
    return createActor<CalendarCanisterService>(canisterId as string, calendarCanisterIdlFactory, identity);
};

console.log("actors.ts updated with specific canister imports and actor creation functions.");

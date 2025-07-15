import { Actor, HttpAgent, type Identity, type ActorSubclass } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

// Import canister-specific declarations for secure backend
import {
    idlFactory as userRegistryIdlFactory,
    canisterId as userRegistryCanisterId
} from '$declarations/user_registry';
import type { _SERVICE as UserRegistryService } from '$declarations/user_registry/user_registry.did';

import {
    idlFactory as calendarSecureIdlFactory,
    canisterId as calendarSecureCanisterId
} from '$declarations/calendar_canister_secure';
import type { _SERVICE as CalendarSecureService } from '$declarations/calendar_canister_secure/calendar_canister_secure.did';

import {
    idlFactory as canisterRegistryIdlFactory,
    canisterId as canisterRegistryCanisterId
} from '$declarations/canister_registry';
import type { _SERVICE as CanisterRegistryService } from '$declarations/canister_registry/canister_registry.did';

import {
    idlFactory as loadBalancerIdlFactory,
    canisterId as loadBalancerCanisterId
} from '$declarations/load_balancer';
import type { _SERVICE as LoadBalancerService } from '$declarations/load_balancer/load_balancer.did';

import {
    idlFactory as schedulingCanisterIdlFactory,
    canisterId as schedulingCanisterCanisterId
} from '$declarations/scheduling_canister';
import type { _SERVICE as SchedulingCanisterService } from '$declarations/scheduling_canister/scheduling_canister.did';

import {
    idlFactory as notificationCanisterIdlFactory,
    canisterId as notificationCanisterCanisterId
} from '$declarations/notification_canister';
import type { _SERVICE as NotificationCanisterService } from '$declarations/notification_canister/notification_canister.did';

import {
    idlFactory as backupCanisterIdlFactory,
    canisterId as backupCanisterCanisterId
} from '$declarations/backup_canister';
import type { _SERVICE as BackupCanisterService } from '$declarations/backup_canister/backup_canister.did';

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
    : 'http://localhost:8000');

  const agent = new HttpAgent({
    host: currentHost,
    identity: identity || undefined,
  });

  // Only fetch root key for local development and if not blocked
  if (import.meta.env.VITE_DFX_NETWORK !== 'ic') {
    try {
      console.log('Attempting to fetch root key...');
      // Add a timeout to prevent hanging
      const fetchRootKeyPromise = agent.fetchRootKey();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Root key fetch timeout')), 3000)
      );
      
      await Promise.race([fetchRootKeyPromise, timeoutPromise]);
      console.log('Successfully fetched root key');
    } catch (error) {
      console.warn('Unable to fetch root key - continuing without it for local development. This is expected when ad blockers are active.', error);
      // In local development, we can continue without root key
      // The actor will still work for many operations
    }
  }

  const actor = Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });

  return actor;
};

// User Registry Actor
export const getUserRegistryActor = async (identity?: Identity | null): Promise<ActorSubclass<UserRegistryService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_USER_REGISTRY || userRegistryCanisterId || 'v56tl-sp777-77774-qaahq-cai';
    
    console.log('getUserRegistryActor called with:', { 
        envUserRegistry: import.meta.env.VITE_CANISTER_ID_USER_REGISTRY,
        userRegistryCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("User Registry Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("User Registry Canister ID not found. Ensure it's in declarations or environment.");
    }
    
    return createActor<UserRegistryService>(canisterId as string, userRegistryIdlFactory, identity);
};

// Calendar Secure Actor
export const getCalendarSecureActor = async (identity?: Identity | null): Promise<ActorSubclass<CalendarSecureService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_CALENDAR_CANISTER_SECURE || calendarSecureCanisterId || 'vizcg-th777-77774-qaaea-cai';
    
    console.log('getCalendarSecureActor called with:', { 
        envCalendarSecure: import.meta.env.VITE_CANISTER_ID_CALENDAR_CANISTER_SECURE,
        calendarSecureCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Calendar Secure Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Calendar Secure Canister ID not found.");
    }
    
    return createActor<CalendarSecureService>(canisterId as string, calendarSecureIdlFactory, identity);
};

// Canister Registry Actor
export const getCanisterRegistryActor = async (identity?: Identity | null): Promise<ActorSubclass<CanisterRegistryService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_CANISTER_REGISTRY || canisterRegistryCanisterId || 'vpyes-67777-77774-qaaeq-cai';
    
    console.log('getCanisterRegistryActor called with:', { 
        envCanisterRegistry: import.meta.env.VITE_CANISTER_ID_CANISTER_REGISTRY,
        canisterRegistryCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Canister Registry ID not found. Environment variables:", import.meta.env);
        throw new Error("Canister Registry ID not found.");
    }
    
    return createActor<CanisterRegistryService>(canisterId as string, canisterRegistryIdlFactory, identity);
};

// Load Balancer Actor
export const getLoadBalancerActor = async (identity?: Identity | null): Promise<ActorSubclass<LoadBalancerService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_LOAD_BALANCER || loadBalancerCanisterId || 'vu5yx-eh777-77774-qaaga-cai';
    
    console.log('getLoadBalancerActor called with:', { 
        envLoadBalancer: import.meta.env.VITE_CANISTER_ID_LOAD_BALANCER,
        loadBalancerCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Load Balancer Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Load Balancer Canister ID not found.");
    }
    
    return createActor<LoadBalancerService>(canisterId as string, loadBalancerIdlFactory, identity);
};

// Scheduling Canister Actor
export const getSchedulingCanisterActor = async (identity?: Identity | null): Promise<ActorSubclass<SchedulingCanisterService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_SCHEDULING_CANISTER || schedulingCanisterCanisterId || 'v27v7-7x777-77774-qaaha-cai';
    
    console.log('getSchedulingCanisterActor called with:', { 
        envSchedulingCanister: import.meta.env.VITE_CANISTER_ID_SCHEDULING_CANISTER,
        schedulingCanisterCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Scheduling Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Scheduling Canister ID not found.");
    }
    
    return createActor<SchedulingCanisterService>(canisterId as string, schedulingCanisterIdlFactory, identity);
};

// Notification Canister Actor
export const getNotificationCanisterActor = async (identity?: Identity | null): Promise<ActorSubclass<NotificationCanisterService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_NOTIFICATION_CANISTER || notificationCanisterCanisterId || 'vt46d-j7777-77774-qaagq-cai';
    
    console.log('getNotificationCanisterActor called with:', { 
        envNotificationCanister: import.meta.env.VITE_CANISTER_ID_NOTIFICATION_CANISTER,
        notificationCanisterCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Notification Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Notification Canister ID not found.");
    }
    
    return createActor<NotificationCanisterService>(canisterId as string, notificationCanisterIdlFactory, identity);
};

// Backup Canister Actor
export const getBackupCanisterActor = async (identity?: Identity | null): Promise<ActorSubclass<BackupCanisterService>> => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_BACKUP_CANISTER || backupCanisterCanisterId || 'ufxgi-4p777-77774-qaadq-cai';
    
    console.log('getBackupCanisterActor called with:', { 
        envBackupCanister: import.meta.env.VITE_CANISTER_ID_BACKUP_CANISTER,
        backupCanisterCanisterId, 
        identity: identity ? 'present' : 'null',
        finalCanisterId: canisterId
    });
    
    if (!canisterId) {
        console.error("Backup Canister ID not found. Environment variables:", import.meta.env);
        throw new Error("Backup Canister ID not found.");
    }
    
    return createActor<BackupCanisterService>(canisterId as string, backupCanisterIdlFactory, identity);
};

console.log("Secure backend actors.ts loaded with comprehensive canister integrations.");

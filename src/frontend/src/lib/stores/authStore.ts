import { writable, type Writable } from 'svelte/store';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

// Define the shape of the authentication state
interface AuthState {
  isLoggedIn: boolean;
  identity: Identity | null;
  principal: Principal | null;
  authClient: AuthClient | null;
}

// Create writable stores for each piece of the auth state
export const isLoggedIn: Writable<boolean> = writable<boolean>(false);
export const identity: Writable<Identity | null> = writable<Identity | null>(null);
export const principal: Writable<Principal | null> = writable<Principal | null>(null);
export const authClientStore: Writable<AuthClient | null> = writable<AuthClient | null>(null); // Renamed to avoid conflict

let globalAuthClient: AuthClient | null = null; // To hold the authClient instance

// Initialize the authentication client
export const initAuth = async (): Promise<void> => {
  if (globalAuthClient) {
    // Already initialized
    // Re-check status in case session expired or was cleared externally
    const currentIsLoggedIn = await globalAuthClient.isAuthenticated();
    const currentIdentity = currentIsLoggedIn ? globalAuthClient.getIdentity() : null;
    const currentPrincipal = currentIdentity ? currentIdentity.getPrincipal() : null;

    isLoggedIn.set(currentIsLoggedIn);
    identity.set(currentIdentity);
    principal.set(currentPrincipal);
    authClientStore.set(globalAuthClient); // Ensure store is updated
    return;
  }

  try {
    const client = await AuthClient.create();
    globalAuthClient = client; // Store the created client
    authClientStore.set(client);

    const currentIsLoggedIn = await client.isAuthenticated();
    isLoggedIn.set(currentIsLoggedIn);

    if (currentIsLoggedIn) {
      const currentIdentity = client.getIdentity();
      identity.set(currentIdentity);
      principal.set(currentIdentity.getPrincipal());
    }
  } catch (error) {
    console.error("Error initializing auth client:", error);
    // Set to default non-authenticated state
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    authClientStore.set(null); // Ensure client is null on error
  }
};

// Login function
export const login = async (): Promise<void> => {
  if (!globalAuthClient) {
    // Attempt to initialize if not already done, though initAuth should ideally be called first
    await initAuth();
    if (!globalAuthClient) { // Check again after initAuth attempt
        console.error("AuthClient not initialized, cannot login.");
        return;
    }
  }

  // The authClient should not be null here if initAuth succeeded
  const client = globalAuthClient!;


  // Determine the II URL based on environment
  const identityProvider = process.env.DFX_NETWORK === 'ic'
    ? 'https://identity.ic0.app/#authorize'
    : `http://localhost:${process.env.REPLICA_PORT}?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}#authorize`;
    // Fallback for local development if replica port/II canister ID env vars are not set directly in Vite's process.env
    // DFX typically injects these. If running Vite standalone, these might need to be configured in vite.config.js or .env
    // For now, let's assume a common local II canister ID if not provided by DFX_NETWORK.
    // const localIiUrl = `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943/#authorize`; // Common local II
    // const identityProvider = process.env.DFX_NETWORK === 'ic'
    // ? 'https://identity.ic0.app/#authorize'
    // : localIiUrl;


  await new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: identityProvider,
      onSuccess: async () => {
        const currentIdentity = client.getIdentity();
        identity.set(currentIdentity);
        principal.set(currentIdentity.getPrincipal());
        isLoggedIn.set(true);
        authClientStore.set(client); // ensure it's set on successful login
        resolve();
      },
      onError: (err) => {
        console.error("Login failed:", err);
        isLoggedIn.set(false);
        identity.set(null);
        principal.set(null);
        reject(err);
      },
      // Optional: windowOpenerFeatures, derivationOrigin, maxTimeToLive
    });
  });
};

// Logout function
export const logout = async (): Promise<void> => {
  if (!globalAuthClient) {
    console.error("AuthClient not initialized, cannot logout.");
    return;
  }
  await globalAuthClient.logout();
  isLoggedIn.set(false);
  identity.set(null);
  principal.set(null);
  // We keep the authClient instance in globalAuthClient and authClientStore for potential re-login
  // but clear sensitive identity/principal data.
};

// Optional: A store that combines all auth state for easier subscription
// import { derived } from 'svelte/store';
// export const authState = derived(
//   [isLoggedIn, identity, principal, authClientStore],
//   ([$isLoggedIn, $identity, $principal, $authClientStore]) => ({
//     isLoggedIn: $isLoggedIn,
//     identity: $identity,
//     principal: $principal,
//     authClient: $authClientStore,
//   })
// );

// Call initAuth on script load if running in a browser context
// This helps to check authentication status as soon as the app loads.
// However, this should be strategically called, e.g., in a root layout load function.
// if (typeof window !== 'undefined') {
//   initAuth();
// }
// No, we will call initAuth from +layout.ts as per plan.

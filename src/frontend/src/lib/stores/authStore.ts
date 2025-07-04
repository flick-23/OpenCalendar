import { writable, type Writable, get } from 'svelte/store';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { getUserRegistryActor } from '$lib/actors/actors';
// Assuming UserProfile type will be defined in user_registry.did.d.ts or similar
// For now, let's define a placeholder. If `get_my_profile` returns `null` or `[]` for no profile, adjust accordingly.
// import type { UserProfile as BackendUserProfile } from '$declarations/user_registry/user_registry.did';
// ^ This would be ideal if UserProfile is an exported type.

// Placeholder UserProfile type - replace with actual type from declarations if available
export interface UserProfile {
  username: string;
  // Add other profile fields here based on your .did file
  // e.g., email?: string; bio?: string;
}

// Create writable stores for each piece of the auth state
export const isLoggedIn: Writable<boolean> = writable<boolean>(false);
export const identity: Writable<Identity | null> = writable<Identity | null>(null);
export const principal: Writable<Principal | null> = writable<Principal | null>(null);
export const authClientStore: Writable<AuthClient | null> = writable<AuthClient | null>(null);
export const userProfile: Writable<UserProfile | null> = writable<UserProfile | null>(null);


let globalAuthClient: AuthClient | null = null;

// Fetch user profile
export const fetchUserProfile = async (): Promise<void> => {
  const currentIdentity = get(identity); // Use get to read current value of store
  if (!currentIdentity) {
    userProfile.set(null);
    console.log("No identity found, cannot fetch profile.");
    return;
  }

  try {
    console.log("Fetching user profile...");
    const userRegistryActor = await getUserRegistryActor(currentIdentity);
    // Assuming get_my_profile returns the profile directly or an optional record
    // Adjust based on the actual return type (e.g., if it's { Ok: profile } or [profile] or null)
    const profileResult = await userRegistryActor.get_my_profile();

    // Example handling if profileResult is an optional record (Vec<UserProfile>)
    // or if it can be null/undefined directly.
    // This depends heavily on your Motoko canister's get_my_profile signature.
    // If it's an array and you expect one profile:
    if (Array.isArray(profileResult) && profileResult.length > 0) {
        // Assuming the first element is the user's profile.
        // And assuming its structure matches UserProfile.
        userProfile.set(profileResult[0] as UserProfile);
        console.log("User profile fetched and set:", profileResult[0]);
    } else if (profileResult && !Array.isArray(profileResult)) {
        // If it returns a single object (or null)
        userProfile.set(profileResult as UserProfile); // Cast needed if type is not perfectly aligned
        console.log("User profile fetched and set:", profileResult);
    } else {
        userProfile.set(null);
        console.log("No profile data returned or profile is empty.");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    userProfile.set(null);
  }
};

// Initialize the authentication client
export const initAuth = async (): Promise<void> => {
  if (globalAuthClient) {
    const currentIsLoggedIn = await globalAuthClient.isAuthenticated();
    const currentIdentity = currentIsLoggedIn ? globalAuthClient.getIdentity() : null;
    isLoggedIn.set(currentIsLoggedIn);
    identity.set(currentIdentity);
    principal.set(currentIdentity ? currentIdentity.getPrincipal() : null);
    authClientStore.set(globalAuthClient);
    if (currentIsLoggedIn) {
      await fetchUserProfile(); // Fetch profile if already logged in
    } else {
      userProfile.set(null); // Clear profile if not logged in
    }
    return;
  }

  try {
    const client = await AuthClient.create();
    globalAuthClient = client;
    authClientStore.set(client);

    const currentIsLoggedIn = await client.isAuthenticated();
    isLoggedIn.set(currentIsLoggedIn);

    if (currentIsLoggedIn) {
      const currentIdentity = client.getIdentity();
      identity.set(currentIdentity);
      principal.set(currentIdentity.getPrincipal());
      await fetchUserProfile(); // Fetch profile after setting identity
    } else {
      userProfile.set(null); // Ensure profile is cleared if not logged in
    }
  } catch (error) {
    console.error("Error initializing auth client:", error);
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    authClientStore.set(null);
    userProfile.set(null);
  }
};

// Login function
export const login = async (): Promise<void> => {
  if (!globalAuthClient) {
    await initAuth(); // Ensure client is initialized
    if (!globalAuthClient) {
        console.error("AuthClient not initialized, cannot login.");
        return;
    }
  }
  const client = globalAuthClient!;

  const iiUrl = process.env.DFX_NETWORK === 'ic'
    ? 'https://identity.ic0.app'
    : `http://127.0.0.1:4943/?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`;


  await new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: iiUrl,
      onSuccess: async () => {
        const currentIdentity = client.getIdentity();
        identity.set(currentIdentity);
        principal.set(currentIdentity.getPrincipal());
        isLoggedIn.set(true);
        authClientStore.set(client);
        await fetchUserProfile(); // Fetch profile on successful login
        resolve();
      },
      onError: (err) => {
        console.error("Login failed:", err);
        isLoggedIn.set(false);
        identity.set(null);
        principal.set(null);
        userProfile.set(null); // Clear profile on login failure
        reject(err);
      },
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
  userProfile.set(null); // Clear profile on logout
  // Keep authClientStore set for potential re-login
};

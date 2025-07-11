import { writable, type Writable, get } from 'svelte/store';
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { getUserRegistryActor } from '$lib/actors/actors';
import type { UserProfile } from '$declarations/user_registry/user_registry.did';

// Create writable stores for each piece of the auth state
export const isLoggedIn: Writable<boolean> = writable<boolean>(false);
export const identity: Writable<Identity | null> = writable<Identity | null>(null);
export const principal: Writable<Principal | null> = writable<Principal | null>(null);
export const authClientStore: Writable<AuthClient | null> = writable<AuthClient | null>(null);
export const userProfile: Writable<UserProfile | null> = writable<UserProfile | null>(null);


let globalAuthClient: AuthClient | null = null;

// Fetch user profile and auto-register if not found
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
    
    // Try to get existing profile first
    const profileResult = await userRegistryActor.get_my_profile();

    // Check if profile exists
    if (Array.isArray(profileResult) && profileResult.length > 0) {
        userProfile.set(profileResult[0] || null);
        console.log("User profile fetched and set:", profileResult[0]);
    } else if (profileResult && !Array.isArray(profileResult)) {
        userProfile.set(profileResult as UserProfile);
        console.log("User profile fetched and set:", profileResult);
    } else {
        // User not registered, attempt auto-registration
        console.log("No profile found, attempting to register user automatically...");
        try {
          // Extract principal for a default name
          const principal = currentIdentity.getPrincipal();
          const principalText = principal.toString();
          // Use a simple name based on principal
          const defaultName = `User-${principalText.slice(-8)}`;
          
          console.log(`Auto-registering user with name: ${defaultName}`);
          const newProfile = await userRegistryActor.register(defaultName);
          userProfile.set(newProfile);
          console.log("User auto-registered successfully:", newProfile);
        } catch (registerError) {
          console.error("Failed to auto-register user:", registerError);
          userProfile.set(null);
        }
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    userProfile.set(null);
  }
};

// Initialize the authentication client
export const initAuth = async (): Promise<void> => {
  if (globalAuthClient) {
    console.log('AuthClient already initialized, checking authentication status...');
    const currentIsLoggedIn = await globalAuthClient.isAuthenticated();
    const currentIdentity = currentIsLoggedIn ? globalAuthClient.getIdentity() : null;
    isLoggedIn.set(currentIsLoggedIn);
    identity.set(currentIdentity);
    principal.set(currentIdentity ? currentIdentity.getPrincipal() : null);
    authClientStore.set(globalAuthClient);
    if (currentIsLoggedIn) {
      console.log('User is already authenticated, fetching profile...');
      await fetchUserProfile(); // Fetch profile if already logged in
    } else {
      userProfile.set(null); // Clear profile if not logged in
    }
    return;
  }

  try {
    console.log('Creating AuthClient...');
    const client = await AuthClient.create();
    globalAuthClient = client;
    authClientStore.set(client);

    const currentIsLoggedIn = await client.isAuthenticated();
    isLoggedIn.set(currentIsLoggedIn);

    if (currentIsLoggedIn) {
      console.log('User is authenticated, setting up identity...');
      const currentIdentity = client.getIdentity();
      identity.set(currentIdentity);
      principal.set(currentIdentity.getPrincipal());
      console.log('Principal:', currentIdentity.getPrincipal().toString());
      await fetchUserProfile(); // Fetch profile after setting identity
    } else {
      console.log('User is not authenticated');
      userProfile.set(null); // Ensure profile is cleared if not logged in
    }
  } catch (error) {
    console.error("Error initializing auth client:", error);
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    authClientStore.set(null);
    userProfile.set(null);
    throw error;
  }
};

// Helper function to detect browser type
const detectBrowser = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent;
  
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  } else if (userAgent.includes('Chrome') || userAgent.includes('Brave')) {
    return 'chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'firefox';
  }
  
  return 'unknown';
};

// Helper function to get the Internet Identity URL
const getInternetIdentityUrl = (): string => {
  const isIC = import.meta.env.VITE_DFX_NETWORK === 'ic';
  
  if (isIC) {
    return 'https://identity.ic0.app';
  }
  
  // For local development, use the local Internet Identity canister
  const iiCanisterId = import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY;
  
  if (!iiCanisterId) {
    console.error('Internet Identity canister ID not found in environment variables');
    throw new Error('Internet Identity canister ID not configured');
  }
  
  const browser = detectBrowser();
  console.log(`Detected browser: ${browser}`);
  
  // For Safari, use the new format that works better
  if (browser === 'safari') {
    return `http://localhost:8000/?canisterId=${iiCanisterId}`;
  }
  
  // For Chrome, Firefox, and others, use localhost for consistency
  // This matches the updated dfx.json binding
  return `http://localhost:8000/?canisterId=${iiCanisterId}`;
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

  try {
    const iiUrl = getInternetIdentityUrl();
    console.log('Attempting to login with Internet Identity URL:', iiUrl);

    // Use redirect-based authentication for better reliability
    await new Promise<void>((resolve, reject) => {
      client.login({
        identityProvider: iiUrl,
        // Force redirect-based login by not setting windowOpenerFeatures
        onSuccess: async () => {
          console.log('Login successful');
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
        // Add maxTimeToLive for token validity (8 hours)
        maxTimeToLive: BigInt(8 * 60 * 60 * 1000 * 1000 * 1000), // 8 hours in nanoseconds
      });
    });
  } catch (error) {
    console.error("Error during login process:", error);
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    userProfile.set(null);
    throw error;
  }
};

// Get the current principal (similar to whoami in the guide)
export const getPrincipal = (): Principal | null => {
  const currentPrincipal = get(principal);
  return currentPrincipal;
};

// Check if user is authenticated
export const checkAuthStatus = async (): Promise<boolean> => {
  if (!globalAuthClient) {
    await initAuth();
  }
  
  if (globalAuthClient) {
    return await globalAuthClient.isAuthenticated();
  }
  
  return false;
};

// Logout function
export const logout = async (): Promise<void> => {
  if (!globalAuthClient) {
    console.error("AuthClient not initialized, cannot logout.");
    return;
  }
  
  try {
    console.log('Logging out...');
    await globalAuthClient.logout();
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    userProfile.set(null); // Clear profile on logout
    console.log('Logout successful');
    // Keep authClientStore set for potential re-login
  } catch (error) {
    console.error("Error during logout:", error);
    // Still clear the state even if logout fails
    isLoggedIn.set(false);
    identity.set(null);
    principal.set(null);
    userProfile.set(null);
    throw error;
  }
};

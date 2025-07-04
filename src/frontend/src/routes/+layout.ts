import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { initAuth, isLoggedIn } from '$lib/stores/authStore'; // Assuming authStore is in $lib/stores
import { get } from 'svelte/store'; // To read store value once

export const load = async ({ url }) => {
  if (browser) { // Run only in the browser
    await initAuth(); // Initialize auth client and check status

    const loggedIn = get(isLoggedIn); // Get current login status
    const currentPath = url.pathname;

    if (!loggedIn && currentPath !== '/login') {
      // If not logged in and not already on the login page, redirect to /login
      // Store the intended destination to redirect after login
      const redirectTo = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
      await goto(`/login${redirectTo}`, { replaceState: true });
    } else if (loggedIn && currentPath === '/login') {
      // If logged in and on the login page, redirect to home or intended destination
      const redirectParam = url.searchParams.get('redirect');
      const destination = redirectParam ? decodeURIComponent(redirectParam) : '/';
      await goto(destination, { replaceState: true });
    }
  }

  // Data returned from load is available to child pages
  return {};
};

// SSR should be false for this +layout.ts if we want it to run only on client-side for auth redirects.
// However, SvelteKit's `browser` check is the standard way to ensure client-side execution of specific logic.
// If we need to ensure no SSR attempts to run this specific load:
export const ssr = false; // Opt-out of server-side rendering for this layout's load function.
// This is important because initAuth() and goto() are client-side operations.

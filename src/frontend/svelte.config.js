import adapter from '@sveltejs/adapter-static'; // Changed to adapter-static
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// default options are suitable for asset canister deployment
			pages: 'dist', // Changed from 'build' to 'dist' to match dfx.json
			assets: 'dist', // Changed from 'build' to 'dist'
			fallback: 'index.html', // SPA mode
			precompress: false
		}),
		alias: {
			// This alias is important for resolving $lib and other SvelteKit paths
			// when building for IC and using generated types from ../declarations
			$declarations: '../declarations'
		}
	}
};

export default config;

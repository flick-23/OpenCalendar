import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Use the static adapter
		adapter: adapter({
			// default options are fine
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // Use 'index.html' for SPA mode
			precompress: false
		}),
		// This is important for dfx to resolve canister imports
		alias: {
			'ic-mops': '../../node_modules/ic-mops/lib/esm'
		}
	}
};

export default config;

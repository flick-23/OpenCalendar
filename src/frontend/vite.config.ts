import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		// Define process.env variables at build time for compatibility with dfx-generated code
		'process.env.CANISTER_ID_CALENDAR_CANISTER_1': JSON.stringify(process.env.VITE_CANISTER_ID_CALENDAR_CANISTER_1 || 'uxrrr-q7777-77774-qaaaq-cai'),
		'process.env.CANISTER_ID_USER_REGISTRY': JSON.stringify(process.env.VITE_CANISTER_ID_USER_REGISTRY || 'ulvla-h7777-77774-qaacq-cai'),
		'process.env.CANISTER_ID_NOTIFICATION_CANISTER': JSON.stringify(process.env.VITE_CANISTER_ID_NOTIFICATION_CANISTER || 'uzt4z-lp777-77774-qaabq-cai'),
		'process.env.CANISTER_ID_SCHEDULING_CANISTER': JSON.stringify(process.env.VITE_CANISTER_ID_SCHEDULING_CANISTER || 'umunu-kh777-77774-qaaca-cai'),
		'process.env.CANISTER_ID_FRONTEND': JSON.stringify(process.env.VITE_CANISTER_ID_FRONTEND || 'u6s2n-gx777-77774-qaaba-cai'),
		'process.env.CANISTER_ID_INTERNET_IDENTITY': JSON.stringify(process.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'ufxgi-4p777-77774-qaadq-cai'),
		'process.env.DFX_NETWORK': JSON.stringify(process.env.VITE_DFX_NETWORK || 'local'),
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:4943',
				changeOrigin: true,
			},
		},
	},
});

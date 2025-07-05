// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DFX_NETWORK: string;
	readonly VITE_CANISTER_ID_INTERNET_IDENTITY: string;
	readonly VITE_CANISTER_ID_CALENDAR_CANISTER_1: string;
	readonly VITE_CANISTER_ID_USER_REGISTRY: string;
	readonly VITE_CANISTER_ID_NOTIFICATION_CANISTER: string;
	readonly VITE_CANISTER_ID_SCHEDULING_CANISTER: string;
	readonly VITE_CANISTER_ID_FRONTEND: string;
}

export {};

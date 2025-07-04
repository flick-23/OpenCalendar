<script>
	import { onMount } from 'svelte';
	import { getUserRegistryActor, getCalendarCanisterActor } from '$lib/actors/actors';

	let canisterStatus = {
		userRegistry: 'Loading...',
		calendar: 'Loading...'
	};

	onMount(async () => {
		try {
			const userRegistryActor = await getUserRegistryActor();
			canisterStatus.userRegistry = `✅ Connected to User Registry: ${userRegistryActor._canisterId}`;
		} catch (error) {
			canisterStatus.userRegistry = `❌ User Registry Error: ${error.message}`;
		}

		try {
			const calendarActor = await getCalendarCanisterActor();
			canisterStatus.calendar = `✅ Connected to Calendar: ${calendarActor._canisterId}`;
		} catch (error) {
			canisterStatus.calendar = `❌ Calendar Error: ${error.message}`;
		}
	});
</script>

<div class="canister-test">
	<h2>Canister Connection Test</h2>
	<div class="status">
		<p>{canisterStatus.userRegistry}</p>
		<p>{canisterStatus.calendar}</p>
	</div>
	<div class="env-info">
		<h3>Environment Variables:</h3>
		<p>USER_REGISTRY: {process.env.CANISTER_ID_USER_REGISTRY || 'undefined'}</p>
		<p>CALENDAR: {process.env.CANISTER_ID_CALENDAR_CANISTER_1 || 'undefined'}</p>
		<p>DFX_NETWORK: {process.env.DFX_NETWORK || 'undefined'}</p>
	</div>
</div>

<style>
	.canister-test {
		padding: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
		margin: 20px 0;
	}
	.status p {
		margin: 10px 0;
		padding: 10px;
		background: #f5f5f5;
		border-radius: 4px;
	}
	.env-info {
		margin-top: 20px;
	}
	.env-info p {
		font-family: monospace;
		font-size: 12px;
	}
</style>

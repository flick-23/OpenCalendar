<script lang="ts">
	import { settingsStore, applyTheme } from '$lib/stores/settingsStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { userProfile } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { X, Settings, Save } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	let isVisible = false;

	// Subscribe to UI store to show/hide modal
	const unsubscribe = uiStore.subscribe((state) => {
		isVisible = state.isSettingsOpen;
	});

	// Clean up subscription on component destroy
	onDestroy(() => {
		unsubscribe();
	});

	function closeModal() {
		uiStore.closeSettings();
	}

	function openFullSettings() {
		closeModal();
		goto('/settings');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	// Quick settings that can be toggled from the modal
	function toggleTheme() {
		const themes = ['light', 'dark', 'auto'] as const;
		const currentIndex = themes.indexOf($settingsStore.theme);
		const nextIndex = (currentIndex + 1) % themes.length;
		const newTheme = themes[nextIndex];
		settingsStore.updateSetting('theme', newTheme);
		applyTheme(newTheme);
	}

	function toggleView() {
		const views = ['month', 'day', 'year'] as const;
		const currentIndex = views.indexOf($settingsStore.defaultView);
		const nextIndex = (currentIndex + 1) % views.length;
		settingsStore.updateSetting('defaultView', views[nextIndex]);
	}

	function toggleNotifications() {
		settingsStore.updateSetting('notifications', !$settingsStore.notifications);
	}
</script>

{#if isVisible}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={handleEscape}
	>
		<div
			class="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-modal-title"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-[#f0f2f5]">
				<div class="flex items-center gap-2">
					<Settings size={20} class="text-[#111418]" />
					<h2 id="settings-modal-title" class="text-lg font-semibold text-[#111418]">
						Quick Settings
					</h2>
				</div>
				<button
					on:click={closeModal}
					class="text-gray-400 hover:text-gray-600 transition-colors"
					aria-label="Close settings"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				<!-- Theme Toggle -->
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-medium text-[#111418]">Theme</h3>
						<p class="text-sm text-gray-600">
							Current: {$settingsStore.theme === 'light' ? 'Light' : $settingsStore.theme === 'dark' ? 'Dark' : 'Auto'}
						</p>
					</div>
					<button
						on:click={toggleTheme}
						class="px-3 py-1 text-sm bg-[#f0f2f5] text-[#111418] rounded-lg hover:bg-[#e8eaed] transition-colors"
					>
						Switch
					</button>
				</div>

				<!-- Default View -->
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-medium text-[#111418]">Default View</h3>
						<p class="text-sm text-gray-600">
							{$settingsStore.defaultView === 'month' ? 'Month' : $settingsStore.defaultView === 'day' ? 'Day' : 'Year'}
						</p>
					</div>
					<button
						on:click={toggleView}
						class="px-3 py-1 text-sm bg-[#f0f2f5] text-[#111418] rounded-lg hover:bg-[#e8eaed] transition-colors"
					>
						Change
					</button>
				</div>

				<!-- Notifications -->
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-medium text-[#111418]">Notifications</h3>
						<p class="text-sm text-gray-600">
							{$settingsStore.notifications ? 'Enabled' : 'Disabled'}
						</p>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={$settingsStore.notifications}
							on:change={toggleNotifications}
							class="sr-only peer"
						/>
						<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0c7ff2]"></div>
					</label>
				</div>

				<!-- User Info -->
				{#if $userProfile}
					<div class="pt-4 border-t border-[#f0f2f5]">
						<h3 class="text-sm font-medium text-[#111418] mb-2">Profile</h3>
						<p class="text-sm text-gray-600">
							<span class="font-medium">Name:</span> {$settingsStore.displayName || $userProfile.name}
						</p>
						<p class="text-xs text-gray-500 mt-1 font-mono">
							{$userProfile.principal.toString()}
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between p-6 border-t border-[#f0f2f5]">
				<button
					on:click={openFullSettings}
					class="text-sm text-[#0c7ff2] hover:text-[#0a6fd1] transition-colors"
				>
					More Settings
				</button>
				<button
					on:click={closeModal}
					class="flex items-center gap-2 px-4 py-2 bg-[#0c7ff2] text-white rounded-lg hover:bg-[#0a6fd1] transition-colors"
				>
					<Save size={16} />
					Done
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Ensure modal appears above everything */
	:global(.fixed.z-50) {
		z-index: 1000;
	}
</style>

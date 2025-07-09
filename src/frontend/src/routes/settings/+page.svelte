<script lang="ts">
	import { goto } from '$app/navigation';
	import { userProfile, identity } from '$lib/stores/authStore';
	import { settingsStore, applyTheme } from '$lib/stores/settingsStore';
	import { ChevronLeft, Save, User, Calendar, Palette, Bell, Shield, Globe } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Settings form data
	let displayName = '';
	let email = '';
	let timezone = '';
	let defaultView = 'month';
	let theme = 'light';
	let weekStartsOn = 'monday';
	let notifications = true;
	let emailNotifications = false;
	let soundEnabled = true;

	// UI state
	let isSaving = false;
	let saveMessage = '';
	let isMobileMenuOpen = false;

	// Available options
	const timezones = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Asia/Tokyo',
		'Asia/Shanghai',
		'Australia/Sydney'
	];

	const viewOptions = [
		{ value: 'day', label: 'Day View' },
		{ value: 'month', label: 'Month View' },
		{ value: 'year', label: 'Year View' }
	];

	const themeOptions = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'auto', label: 'Auto' }
	];

	const weekStartOptions = [
		{ value: 'sunday', label: 'Sunday' },
		{ value: 'monday', label: 'Monday' }
	];

	onMount(() => {
		// Load user profile data into settings if available (only if not already set)
		if ($userProfile && !$settingsStore.displayName) {
			settingsStore.updateSetting('displayName', $userProfile.name || '');
		}

		// Apply current theme
		applyTheme($settingsStore.theme);
	});

	function goBack() {
		goto('/');
	}

	async function handleSave() {
		isSaving = true;
		saveMessage = '';

		try {
			// Settings are automatically saved through the store

			// Check if user tried to change their name
			if ($userProfile && $settingsStore.displayName !== $userProfile.name) {
				saveMessage =
					// 'Settings saved! Your display name will be updated locally, but will reset when you refresh the page.';
					"Settings saved! Refresh the page if you don't see changes.";
			} else {
				saveMessage = 'Settings saved successfully!';
			}

			// Apply theme changes
			applyTheme($settingsStore.theme);

			setTimeout(() => {
				saveMessage = '';
			}, 5000);
		} catch (error) {
			console.error('Error saving settings:', error);
			saveMessage = 'Error saving settings. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	function resetToDefaults() {
		if (confirm('Are you sure you want to reset all settings to defaults?')) {
			settingsStore.reset();
			applyTheme('light');
		}
	}

	// Reactive statement to apply theme changes immediately
	$: if ($settingsStore.theme) {
		applyTheme($settingsStore.theme);
	}
</script>

<svelte:head>
	<title>Settings - OpenCalendar</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					on:click={goBack}
					class="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
					title="Back to Calendar"
				>
					<ChevronLeft size={20} />
				</button>
				<div class="flex items-center gap-3">
					<img src="/OpenCalendar.png" alt="OpenCalendar Logo" class="h-8 w-8 flex-shrink-0" />
					<h1 class="text-xl font-bold text-gray-900">Settings</h1>
				</div>
			</div>
			<button
				on:click={handleSave}
				disabled={isSaving}
				class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<Save size={16} />
				{isSaving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if saveMessage}
			<div
				class="mb-6 p-4 rounded-lg {saveMessage.includes('Error')
					? 'bg-red-50 text-red-700 border border-red-200'
					: 'bg-green-50 text-green-700 border border-green-200'}"
			>
				{saveMessage}
			</div>
		{/if}

		<div class="space-y-8">
			<!-- Profile Section -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-6">
					<User size={20} class="text-gray-600" />
					<h2 class="text-lg font-semibold text-gray-900">Profile</h2>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
							Display Name
						</label>
						<input
							id="displayName"
							type="text"
							bind:value={$settingsStore.displayName}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							placeholder="Your display name"
						/>
						<!-- <p class="text-xs text-blue-600 mt-1">
							💡 You can customize your display name here. Note: Changes are saved locally and will reset when you refresh the page.
						</p> -->
					</div>
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							Email (Optional)
						</label>
						<input
							id="email"
							type="email"
							bind:value={$settingsStore.email}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							placeholder="your.email@example.com"
						/>
						<p class="text-xs text-gray-500 mt-1">
							📧 Add your email for notifications and account recovery (stored locally)
						</p>
					</div>
				</div>
			</section>

			<!-- Calendar Section -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-6">
					<Calendar size={20} class="text-gray-600" />
					<h2 class="text-lg font-semibold text-gray-900">Calendar</h2>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">
							Timezone
						</label>
						<select
							id="timezone"
							bind:value={$settingsStore.timezone}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						>
							{#each timezones as tz}
								<option value={tz}>{tz}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="defaultView" class="block text-sm font-medium text-gray-700 mb-2">
							Default View
						</label>
						<select
							id="defaultView"
							bind:value={$settingsStore.defaultView}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						>
							{#each viewOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="weekStartsOn" class="block text-sm font-medium text-gray-700 mb-2">
							Week Starts On
						</label>
						<select
							id="weekStartsOn"
							bind:value={$settingsStore.weekStartsOn}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						>
							{#each weekStartOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</section>

			<!-- Appearance Section -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-6">
					<Palette size={20} class="text-gray-600" />
					<h2 class="text-lg font-semibold text-gray-900">Appearance</h2>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="theme" class="block text-sm font-medium text-gray-700 mb-2"> Theme </label>
						<select
							id="theme"
							bind:value={$settingsStore.theme}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						>
							{#each themeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</section>

			<!-- Notifications Section -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-6">
					<Bell size={20} class="text-gray-600" />
					<h2 class="text-lg font-semibold text-gray-900">Notifications</h2>
				</div>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-gray-900">Enable Notifications</h3>
							<p class="text-sm text-gray-500">Receive reminders for upcoming events</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={$settingsStore.notifications}
								class="sr-only peer"
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
							></div>
						</label>
					</div>

					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-gray-900">Email Notifications</h3>
							<p class="text-sm text-gray-500">Send event reminders to your email</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={$settingsStore.emailNotifications}
								disabled={!$settingsStore.notifications}
								class="sr-only peer"
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"
							></div>
						</label>
					</div>

					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-gray-900">Sound Notifications</h3>
							<p class="text-sm text-gray-500">Play sound for event reminders</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={$settingsStore.soundEnabled}
								disabled={!$settingsStore.notifications}
								class="sr-only peer"
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"
							></div>
						</label>
					</div>
				</div>
			</section>

			<!-- Data & Privacy Section -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-6">
					<Shield size={20} class="text-gray-600" />
					<h2 class="text-lg font-semibold text-gray-900">Data & Privacy</h2>
				</div>
				<div class="space-y-4">
					<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<h3 class="text-sm font-medium text-blue-900 mb-2">Decentralized & Secure</h3>
						<p class="text-sm text-blue-700">
							Your calendar data is stored securely on the Internet Computer blockchain. You have
							full control over your data and who can access it.
						</p>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-gray-900">Principal ID</h3>
							<p class="text-sm text-gray-500 font-mono">
								{$identity?.getPrincipal().toString() || 'Not available'}
							</p>
						</div>
					</div>
				</div>
			</section>

			<!-- Actions -->
			<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-6">Advanced</h2>
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						on:click={resetToDefaults}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Reset to Defaults
					</button>
				</div>
			</section>
		</div>
	</main>
</div>

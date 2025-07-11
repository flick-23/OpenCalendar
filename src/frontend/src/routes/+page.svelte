<script lang="ts">
	import CalendarComponent from '$lib/components/Calendar.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import {
		isLoggedIn,
		userProfile,
		identity as authIdentity,
		fetchUserProfile,
		login
	} from '$lib/stores/authStore';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let loginLoading = false;

	// Handle redirect after login
	$: if ($isLoggedIn) {
		const redirectParam = $page.url.searchParams.get('redirect');
		if (redirectParam) {
			const destination = decodeURIComponent(redirectParam);
			goto(destination, { replaceState: true });
		}
	}

	const handleInternetIdentityLogin = async () => {
		loginLoading = true;
		try {
			await login();
			// Handle redirect after successful login
			const redirectParam = $page.url.searchParams.get('redirect');
			if (redirectParam) {
				const destination = decodeURIComponent(redirectParam);
				await goto(destination, { replaceState: true });
			}
		} catch (error) {
			console.error('Login failed:', error);
		} finally {
			loginLoading = false;
		}
	};

	const handlePlugWalletLogin = async () => {
		// Placeholder for Plug Wallet login
		alert('Plug Wallet login not implemented yet');
	};

	onMount(async () => {
		// Simple onMount - new events system doesn't need calendar selection
	});

	onDestroy(() => {
		// No cleanup needed for simplified system
	});
</script>

<svelte:head>
	<title>OpenCalendar - Decentralized Calendar</title>
	<meta name="description" content="A decentralized calendar application built on ICP" />
	<link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?display=swap&family=Noto+Sans:wght@400;500;700;900&family=Plus+Jakarta+Sans:wght@400;500;700;800"
	/>
</svelte:head>

{#if $isLoggedIn}
	{#if $userProfile}
		<CalendarComponent />
	{:else}
		<!-- Show loading while profile is being fetched/registered -->
		<div class="min-h-screen bg-white flex items-center justify-center">
			<div class="text-center">
				<div
					class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0c7ff2] mx-auto mb-4"
				></div>
				<p class="text-[#111418] text-lg font-medium">Setting up your account...</p>
			</div>
		</div>
	{/if}
{:else}
	<!-- Landing Page -->
	<div
		class="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden"
		style="font-family: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;"
	>
		<div class="layout-container flex h-full grow flex-col">
			<header
				class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f5] px-4 sm:px-10 py-3"
			>
				<div class="flex items-center gap-4 text-[#111418]">
					<img src="/OpenCalendar.png" alt="OpenCalendar Logo" class="h-8 w-8 flex-shrink-0" />
					<h2 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">
						OpenCalendar
					</h2>
				</div>
				<div class="flex flex-1 justify-end gap-4 sm:gap-8">
					<div class="hidden sm:flex items-center gap-9">
						<a class="text-[#111418] text-sm font-medium leading-normal" href="#features"
							>Features</a
						>
						<a class="text-[#111418] text-sm font-medium leading-normal" href="#pricing">Pricing</a>
						<a class="text-[#111418] text-sm font-medium leading-normal" href="#support">Support</a>
					</div>
					<button
						class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f5] text-[#111418] text-sm font-bold leading-normal tracking-[0.015em]"
						on:click={handleInternetIdentityLogin}
					>
						<span class="truncate">Login</span>
					</button>
				</div>
			</header>
			<div class="px-4 sm:px-10 lg:px-40 flex flex-1 justify-center py-5">
				<div class="layout-content-container flex flex-col w-full max-w-[1200px] py-5">
					<!-- Hero Section -->
					<section class="hero-section py-16 text-center">
						<div class="max-w-4xl mx-auto">
							<h1 class="text-[#111418] text-5xl sm:text-6xl font-bold leading-tight mb-6">
								Your Calendar, Your Data. Finally.
							</h1>
							<p
								class="text-[#111418] text-xl sm:text-2xl font-normal leading-relaxed mb-8 max-w-3xl mx-auto"
							>
								OpenCalendar offers the familiar, powerful features of your favorite calendar, built
								on a decentralized network. No ads, no data mining. Just your schedule, owned and
								controlled by you.
							</p>
							<div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
								<button
									class="flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-8 bg-[#0c7ff2] text-white text-lg font-bold leading-normal tracking-[0.015em] hover:bg-[#0a6fd1] transition-colors"
									on:click={handleInternetIdentityLogin}
									disabled={loginLoading}
								>
									<span class="truncate">
										{#if loginLoading}
											Getting Started...
										{:else}
											Get Started - It's Free
										{/if}
									</span>
								</button>
								<button
									class="flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-8 bg-[#f0f2f5] text-[#111418] text-lg font-bold leading-normal tracking-[0.015em] hover:bg-[#e8eaed] transition-colors"
									on:click={handlePlugWalletLogin}
								>
									<span class="truncate">Try with Plug Wallet</span>
								</button>
							</div>
							<!-- Product Visual Placeholder -->
							<div class="bg-gradient-to-br from-[#f0f2f5] to-[#e8eaed] rounded-2xl p-8 shadow-lg">
								<div class="bg-white rounded-xl p-6 shadow-md">
									<div class="flex items-center justify-between mb-4">
										<h3 class="text-lg font-semibold text-[#111418]">Week View</h3>
										<div class="flex gap-2">
											<div class="w-3 h-3 bg-red-400 rounded-full"></div>
											<div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
											<div class="w-3 h-3 bg-green-400 rounded-full"></div>
										</div>
									</div>
									<div class="grid grid-cols-7 gap-1 text-sm">
										<div class="text-center font-medium text-[#111418] py-2">Mon</div>
										<div class="text-center font-medium text-[#111418] py-2">Tue</div>
										<div class="text-center font-medium text-[#111418] py-2">Wed</div>
										<div class="text-center font-medium text-[#111418] py-2">Thu</div>
										<div class="text-center font-medium text-[#111418] py-2">Fri</div>
										<div class="text-center font-medium text-[#111418] py-2">Sat</div>
										<div class="text-center font-medium text-[#111418] py-2">Sun</div>
									</div>
									<div class="mt-4 space-y-2">
										<div class="bg-blue-100 border-l-4 border-blue-500 p-3 rounded">
											<div class="text-sm font-medium text-[#111418]">Team Meeting</div>
											<div class="text-xs text-gray-600">10:00 AM - 11:00 AM</div>
										</div>
										<div class="bg-green-100 border-l-4 border-green-500 p-3 rounded">
											<div class="text-sm font-medium text-[#111418]">Project Review</div>
											<div class="text-xs text-gray-600">2:00 PM - 3:30 PM</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
					<!-- Features Section -->
					<section class="features-section py-16">
						<div class="max-w-6xl mx-auto">
							<h2 class="text-[#111418] text-4xl font-bold text-center mb-16">
								All the Features You Need
							</h2>

							<!-- Feature 1 -->
							<div class="flex flex-col lg:flex-row items-center gap-12 mb-20">
								<div class="lg:w-1/2">
									<h3 class="text-[#111418] text-2xl font-bold mb-4">Intuitive Scheduling</h3>
									<p class="text-[#111418] text-lg leading-relaxed">
										Create, manage, and color-code events with ease. Our clean interface makes
										organizing your life simple and enjoyable.
									</p>
								</div>
								<div class="lg:w-1/2">
									<div class="bg-white rounded-2xl p-6 shadow-lg border">
										<div class="bg-[#0c7ff2] text-white rounded-lg p-4 mb-4">
											<h4 class="font-semibold mb-2">Create New Event</h4>
											<div class="space-y-3">
												<div class="bg-white bg-opacity-20 rounded p-2">
													<input
														class="bg-transparent text-white placeholder-blue-200 w-full"
														placeholder="Event title"
													/>
												</div>
												<div class="flex gap-2">
													<div class="bg-white bg-opacity-20 rounded p-2 flex-1">
														<input
															class="bg-transparent text-white placeholder-blue-200 w-full text-sm"
															placeholder="Date"
														/>
													</div>
													<div class="bg-white bg-opacity-20 rounded p-2 flex-1">
														<input
															class="bg-transparent text-white placeholder-blue-200 w-full text-sm"
															placeholder="Time"
														/>
													</div>
												</div>
												<div class="flex gap-2">
													<div class="w-6 h-6 bg-red-400 rounded-full"></div>
													<div class="w-6 h-6 bg-blue-400 rounded-full ring-2 ring-white"></div>
													<div class="w-6 h-6 bg-green-400 rounded-full"></div>
													<div class="w-6 h-6 bg-yellow-400 rounded-full"></div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Feature 2 -->
							<div class="flex flex-col lg:flex-row-reverse items-center gap-12 mb-20">
								<div class="lg:w-1/2">
									<h3 class="text-[#111418] text-2xl font-bold mb-4">Seamless & Secure Sharing</h3>
									<p class="text-[#111418] text-lg leading-relaxed">
										Share calendars with colleagues or family using their Principal ID. Granular
										permissions let you control exactly what they can see or edit.
									</p>
								</div>
								<div class="lg:w-1/2">
									<div class="bg-white rounded-2xl p-6 shadow-lg border">
										<h4 class="font-semibold mb-4 text-[#111418]">Share Calendar Settings</h4>
										<div class="space-y-4">
											<div class="border rounded-lg p-4">
												<div class="flex items-center justify-between mb-2">
													<span class="font-medium">john.doe@ic0.app</span>
													<span class="text-sm text-green-600 bg-green-100 px-2 py-1 rounded"
														>Can Edit</span
													>
												</div>
												<div class="text-sm text-gray-600">Full access to calendar events</div>
											</div>
											<div class="border rounded-lg p-4">
												<div class="flex items-center justify-between mb-2">
													<span class="font-medium">team@company.ic0.app</span>
													<span class="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded"
														>Can View</span
													>
												</div>
												<div class="text-sm text-gray-600">Read-only access to events</div>
											</div>
											<div
												class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
											>
												<span class="text-gray-500">+ Add new collaborator</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Feature 3 -->
							<div class="flex flex-col lg:flex-row items-center gap-12">
								<div class="lg:w-1/2">
									<h3 class="text-[#111418] text-2xl font-bold mb-4">Truly Cross-Platform</h3>
									<p class="text-[#111418] text-lg leading-relaxed">
										Access your calendar on any device. Our responsive design ensures a flawless
										experience on desktop, tablet, and mobile.
									</p>
								</div>
								<div class="lg:w-1/2">
									<div class="relative">
										<!-- Desktop -->
										<div class="bg-gray-800 rounded-t-lg p-2">
											<div class="flex gap-2">
												<div class="w-3 h-3 bg-red-400 rounded-full"></div>
												<div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
												<div class="w-3 h-3 bg-green-400 rounded-full"></div>
											</div>
										</div>
										<div class="bg-white border-2 border-gray-300 rounded-b-lg p-4">
											<div class="grid grid-cols-7 gap-1 text-xs mb-3">
												<div class="text-center font-medium">Mon</div>
												<div class="text-center font-medium">Tue</div>
												<div class="text-center font-medium">Wed</div>
												<div class="text-center font-medium">Thu</div>
												<div class="text-center font-medium">Fri</div>
												<div class="text-center font-medium">Sat</div>
												<div class="text-center font-medium">Sun</div>
											</div>
											<div class="space-y-1">
												<div class="bg-blue-100 border-l-2 border-blue-500 p-2 rounded text-xs">
													Meeting
												</div>
												<div class="bg-green-100 border-l-2 border-green-500 p-2 rounded text-xs">
													Review
												</div>
											</div>
										</div>
										<!-- Mobile -->
										<div
											class="absolute -bottom-4 -right-4 w-24 h-40 bg-gray-800 rounded-2xl p-1 shadow-lg"
										>
											<div class="bg-white rounded-xl h-full p-2">
												<div class="text-xs font-bold text-center mb-2 truncate">Jun 29</div>
												<div class="space-y-1">
													<div class="bg-blue-100 rounded p-1 text-xs">Meeting</div>
													<div class="bg-green-100 rounded p-1 text-xs">Review</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					<!-- Footer Section -->
					<footer class="border-t border-[#f0f2f5] py-12 mt-16">
						<div class="max-w-6xl mx-auto px-8">
							<div class="flex flex-col md:flex-row justify-between items-center gap-8">
								<!-- Company Info -->
								<div class="flex items-center gap-3">
									<img
										src="/OpenCalendar.png"
										alt="OpenCalendar Logo"
										class="h-6 w-6 flex-shrink-0"
									/>
									<span class="text-[#111418] font-semibold">OpenCalendar</span>
								</div>

								<!-- Links -->
								<div class="flex flex-wrap justify-center gap-8 text-sm">
									<a href="#features" class="text-[#111418] hover:text-[#0c7ff2] transition-colors"
										>Features</a
									>
									<button class="text-[#111418] hover:text-[#0c7ff2] transition-colors"
										>Privacy</button
									>
									<button class="text-[#111418] hover:text-[#0c7ff2] transition-colors"
										>Support</button
									>
									<button class="text-[#111418] hover:text-[#0c7ff2] transition-colors">Docs</button
									>
								</div>

								<!-- Copyright -->
								<div class="text-sm text-gray-600">© 2025 OpenCalendar. Built on ICP.</div>
							</div>
						</div>
					</footer>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Add EventModal component to handle event viewing/editing -->
<EventModal />

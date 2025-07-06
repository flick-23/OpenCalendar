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
	import { getUserRegistryActor } from '$lib/actors/actors';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let showRegistration = false;
	let registrationName = '';
	let registrationLoading = false;
	let registrationError = '';
	let loginLoading = false;

	$: if (
		$isLoggedIn &&
		$userProfile === null &&
		$authIdentity &&
		!$authIdentity.getPrincipal().isAnonymous()
	) {
		showRegistration = true;
	} else {
		showRegistration = false;
	}

	// Handle redirect after login
	$: if ($isLoggedIn && $userProfile) {
		const redirectParam = $page.url.searchParams.get('redirect');
		if (redirectParam) {
			const destination = decodeURIComponent(redirectParam);
			goto(destination, { replaceState: true });
		}
	}

	const handleRegistration = async () => {
		if (!registrationName.trim()) {
			registrationError = 'Please enter your name.';
			return;
		}
		registrationLoading = true;
		registrationError = '';
		try {
			const currentIdentity = $authIdentity;
			if (!currentIdentity) throw new Error('Identity not available.');
			const userRegistryActor = await getUserRegistryActor(currentIdentity);
			await userRegistryActor.register(registrationName);
			await fetchUserProfile(); // Refresh profile
			showRegistration = false;
		} catch (error: any) {
			console.error('Registration failed:', error);
			registrationError = error.message?.includes('User already registered')
				? 'Already registered. Refreshing...'
				: 'Registration failed.';
			if (registrationError.includes('Refreshing')) await fetchUserProfile();
		} finally {
			registrationLoading = false;
		}
	};

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

{#if showRegistration}
	<div class="registration-form bg-white p-8 rounded-lg shadow-md max-w-md mx-auto my-10">
		<h2 class="text-xl font-semibold text-center mb-6">Welcome! Please Register</h2>
		{#if registrationError}<p class="text-red-500 text-sm mb-4">{registrationError}</p>{/if}
		<input
			type="text"
			bind:value={registrationName}
			placeholder="Your Name"
			class="w-full px-3 py-2 border rounded mb-4"
			disabled={registrationLoading}
		/>
		<button
			on:click={handleRegistration}
			disabled={registrationLoading}
			class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-75"
		>
			{#if registrationLoading}Registering...{:else}Register{/if}
		</button>
	</div>
{:else if $isLoggedIn && $userProfile}
	<CalendarComponent />
{:else if !$isLoggedIn}
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

					<!-- Social Proof Section -->
					<section class="social-proof-section py-16 bg-[#f8f9fa] rounded-2xl my-16">
						<div class="max-w-6xl mx-auto px-8">
							<h2 class="text-[#111418] text-3xl font-bold text-center mb-12">
								Trusted by Privacy Advocates & Productivity Enthusiasts
							</h2>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
								<!-- Testimonial 1 -->
								<div class="bg-white rounded-xl p-6 shadow-md">
									<div class="flex items-center mb-4">
										{#each Array(5) as _}
											<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
												<path
													d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
												/>
											</svg>
										{/each}
									</div>
									<p class="text-[#111418] text-base mb-4">
										"Finally, a calendar that respects my privacy. No more worrying about big tech
										companies mining my schedule data."
									</p>
									<div class="text-sm text-gray-600">
										<strong>Alex R.</strong> - Web3 Developer
									</div>
								</div>

								<!-- Testimonial 2 -->
								<div class="bg-white rounded-xl p-6 shadow-md">
									<div class="flex items-center mb-4">
										{#each Array(5) as _}
											<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
												<path
													d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
												/>
											</svg>
										{/each}
									</div>
									<p class="text-[#111418] text-base mb-4">
										"The interface is clean and intuitive. I switched from Google Calendar and
										haven't looked back. True ownership of my data!"
									</p>
									<div class="text-sm text-gray-600">
										<strong>Sarah M.</strong> - Privacy Advocate
									</div>
								</div>

								<!-- Testimonial 3 -->
								<div class="bg-white rounded-xl p-6 shadow-md">
									<div class="flex items-center mb-4">
										{#each Array(5) as _}
											<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
												<path
													d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
												/>
											</svg>
										{/each}
									</div>
									<p class="text-[#111418] text-base mb-4">
										"Built on ICP with excellent performance. The decentralized approach gives me
										peace of mind about my personal data."
									</p>
									<div class="text-sm text-gray-600">
										<strong>Marcus K.</strong> - Productivity Enthusiast
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
												<div class="text-xs font-bold text-center mb-2">OpenCalendar</div>
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
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-center text-gray-500 mt-10">Loading user information...</p>
{/if}

<!-- Add EventModal component to handle event viewing/editing -->
<EventModal />

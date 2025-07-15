<!--
  Toast Component - Displays temporary notifications
  
  This component renders toast notifications with different types and animations.
  It automatically handles positioning, animations, and dismissal.
-->
<script lang="ts">
	import { toastStore, type Toast } from '$lib/stores/toastStore';
	import { fly, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	// Icons for different toast types
	const icons = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};

	// Color schemes for different toast types
	const colorSchemes = {
		success: {
			bg: 'bg-green-50',
			border: 'border-green-200',
			text: 'text-green-800',
			icon: 'text-green-500'
		},
		error: {
			bg: 'bg-red-50',
			border: 'border-red-200',
			text: 'text-red-800',
			icon: 'text-red-500'
		},
		warning: {
			bg: 'bg-yellow-50',
			border: 'border-yellow-200',
			text: 'text-yellow-800',
			icon: 'text-yellow-500'
		},
		info: {
			bg: 'bg-blue-50',
			border: 'border-blue-200',
			text: 'text-blue-800',
			icon: 'text-blue-500'
		}
	};

	function handleDismiss(id: string) {
		toastStore.removeToast(id);
	}

	function getColorScheme(type: Toast['type']) {
		return colorSchemes[type] || colorSchemes.info;
	}
</script>

<!-- Toast Container -->
<div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
	{#each $toastStore.toasts as toast (toast.id)}
		<div
			animate:flip={{ duration: 300 }}
			in:fly={{ x: 300, duration: 300 }}
			out:fade={{ duration: 200 }}
			class="relative {getColorScheme(toast.type).bg} {getColorScheme(toast.type).border} 
			       border rounded-lg shadow-lg p-4 min-w-[300px] max-w-sm"
		>
			<!-- Close button -->
			{#if toast.dismissible}
				<button
					on:click={() => handleDismiss(toast.id)}
					class="absolute top-2 right-2 {getColorScheme(toast.type).text} 
					       hover:opacity-70 transition-opacity"
					aria-label="Dismiss notification"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			{/if}

			<!-- Content -->
			<div class="flex items-start space-x-3">
				<!-- Icon -->
				<div class="flex-shrink-0 {getColorScheme(toast.type).icon}">
					<div
						class="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold"
					>
						{icons[toast.type]}
					</div>
				</div>

				<!-- Message -->
				<div class="flex-1 min-w-0">
					<h4 class="font-medium {getColorScheme(toast.type).text} text-sm">
						{toast.title}
					</h4>
					{#if toast.message}
						<p class="mt-1 text-sm {getColorScheme(toast.type).text} opacity-80">
							{toast.message}
						</p>
					{/if}
				</div>
			</div>

			<!-- Progress bar for timed toasts -->
			{#if toast.duration && toast.duration > 0}
				<div
					class="absolute bottom-0 left-0 right-0 h-1 {getColorScheme(toast.type)
						.bg} rounded-b-lg overflow-hidden"
				>
					<div
						class="h-full {getColorScheme(toast.type)
							.icon} bg-current opacity-30 animate-shrink-width"
						style="animation-duration: {toast.duration}ms;"
					></div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	@keyframes shrink-width {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	.animate-shrink-width {
		animation: shrink-width linear;
	}
</style>

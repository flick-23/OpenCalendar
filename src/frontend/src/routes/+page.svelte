<script>
	import Calendar from '$lib/components/Calendar.svelte';
</script>

<svelte:head>
	<title>ICP Calendar</title>
	<meta name="description" content="A simple calendar application" />
</svelte:head>

<div class="container">
	<h1>ICP Calendar</h1>
	<Calendar />
</div>

<style>
	:global(body) { /* Apply to body for overall page background */
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
		background-color: #f4f7f9; /* Light grayish blue background */
		margin: 0;
		color: #333;
	}
	.container {
		max-width: 1000px; /* Increased max-width */
		margin: 0 auto;
		padding: 20px;
	}
	h1 {
		text-align: center;
		margin-top: 20px; /* Added margin-top */
		margin-bottom: 30px;
		color: #2c3e50; /* Darker, more modern heading color */
		font-weight: 600; /* Slightly bolder */
		font-size: 2.2em; /* Larger heading */
	}
</style>

<script>
	import Datepicker from 'svelte-calendar';
	import daysSince from './daysSince.js';
	let selected;
	$: result = selected ? daysSince(selected.getTime()) : {}
</script>

<main>
	<span>Days Since:</span>
	<Datepicker format={'#{d}/#{m}/#{Y}'} bind:selected/>
	{#if selected}
		<table>
		{#each Object.keys(result) as key}
			<tr><td>{key}:</td><td>{parseInt(result[key])}</td></tr>
		{/each}
		</table>
	{/if}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	table {
		margin: 40px auto 0;
		text-align: left;
	}
	tr {
		padding: 4px;
	}
	td {
		padding: 0 4px;
	}
</style>
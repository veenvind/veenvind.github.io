<script>
	import {onMount} from 'svelte';
	import {derived} from 'svelte/store';
	import {Datepicker} from 'svelte-calendar';
	import daysSince from './daysSince.js';

	const theme = {
		calendar: {
			width: '600px',
			shadow: '0px 0px 5px rgba(0, 0, 0, 0.25)'
		}
	};

	const start = new Date('1970-01-01');
	let store;
	let selected;
	onMount(() => {
		selected = derived(
			store,
			$store => $store?.selected ? daysSince($store.selected.getTime()) : {}
		);
	});

</script>

<main>
	<span>Days Since:</span>
	<Datepicker bind:store {theme} />

	{#if $store?.selected}
		<table>
		{#each Object.keys($selected) as key}
			<tr><td>{key}:</td><td>{parseInt($selected[key])}</td></tr>
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
	button {
		background: purple;
		color: #fff;
		border: 0;
		padding: 18px 30px;
		font-size: 1.2em;
		border-radius: 6px;
		cursor: pointer;
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
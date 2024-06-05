<script lang="ts">
	import { onMount } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';

	const TileStrings: string[] = [
		'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];
	const NewTileStrings: string[] = [
		'T\ta|name:Full|\ts|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|\t',
		' T\ta|name:Top|\ts|background:magenta|min-height:150px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'   T\ta|name:Top|\ts|background:magenta|min-height:50px|\t',
		'   T\ta|name:Bottom|\ts|background:magenta|min-height:100px|\t',
		'  T\ta|name:Right|\ts|background:cyan|width:100%|display:flex|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:white|min-height:350px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'  T\ta|name:Middle|\ts|background:cyan|width:100%|display:flex|\t',
		'  T\ta|name:Right|\ts|background:yellow|min-width:200px|\t'
	];


	const List: RS1.TileList = new RS1.TileList(TileStrings); // remove temporarily

	onMount(() => {
		console.log ('onMount Plotter!');
		console.log ('TileList Str =\n' + List.toString ());
		let tiles = document.querySelector('.tiles');
		if (tiles) {
			const plotter: Plotter = new Plotter(List, tiles as HTMLDivElement);
			plotter.PlotTiles();
		} // RndBtn	a|name:Button|inner:Click|redirect:https://moocode.lol/|	s|width:110|height:50|background:#1e1e1e|color:white|
	});
</script>

<div class="tiles" />

<style>
	.tiles {
		height: 100vh;
		width: 100vw;
	}
</style>

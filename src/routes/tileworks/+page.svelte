<script lang="ts">
	import { onMount } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';
	import { RTile } from '../../components/tiles/RTile'
   
	// const TileStrings: string[] = [
	// 	'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
	// 	' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
	// 	' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
	// 	'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
	// 	'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
	// 	'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
	// 	'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	// ];

	const TileStrings: string[] = [
		'T\ta|name:Full|\ts|display:flex|flex-direction:column|align-items:center|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];

	const List: RS1.TileList = new RS1.TileList(TileStrings); // remove temporarily

	// onMount(() => {
	// 	let tiles = document.querySelector('.tilesabc');
	// });
</script>

<!-- <div class="tilesabc" style="color:cyan;height:200vh;width:200vw">
<r-tile />
</div> -->

<div class="tiles">
	<r-tile tileString = {TileStrings}>	</r-tile>
</div>
<style>
	.tiles {
		height: 100vh;
		width: 100vw;
	}
</style>

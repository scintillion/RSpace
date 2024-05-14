<script lang="ts">
	import { InitClient } from '$lib/API/client/request';
	import { onMount } from 'svelte';
	import { RTile } from '../components/tiles/RTile'
	// import { CoffeeMug } from '../components/tiles/coffeemug'
	
	// var comp : HTMLElement;
	// var container : HTMLElement;
//	<div bind:this ={container}/>

// const TileStrings: string[] =[
// 		'T\ta|class:Tile|\ts|background:red|width:50px|height:50px|\t',
// 	];

const TileStrings: string[] = [
		'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:5vw|height:5vh|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];

	
	
	onMount(() => {
		console.log ('Entry InitClient!');
		InitClient ();
		// comp = document.createElement ('r-tile');
		// if (comp) 
			// container.appendChild (comp);
	});
	</script>
	
	
	<a href="/plotter/">Plotter</a>
	<a href="/editor/">Editor</a>
	<a href="/loleditor/">LoL Editor</a>
	<a href="/dbeditor/">Database Editor</a>
	<a href="/apitesting/">API Testing</a>
	<a href="/vhelsing">VHelsing</a>
	<a href="/tileworks">TileWorks</a>
	<!-- <r-tile attrStr='QED' color="blue"/> -->
	<r-tile tileString = {TileStrings}>	</r-tile>
	
	<style lang="scss">
		a {
			color: white;
			font-size: 24px;
		}
	</style>
	
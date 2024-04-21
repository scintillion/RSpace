<script lang="ts">
	import { InitClient } from '$lib/API/client/request';
	import { onMount } from 'svelte';
	import { RTile } from '../components/tiles/RTile'
	// import { CoffeeMug } from '../components/tiles/coffeemug'
	
	// var comp : HTMLElement;
	// var container : HTMLElement;
//	<div bind:this ={container}/>
	
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
	<r-tile attrStr='QED' color="blue"/>
	
	<style lang="scss">
		a {
			color: white;
			font-size: 24px;
		}
	</style>
	
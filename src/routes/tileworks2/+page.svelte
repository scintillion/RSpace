<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RSsvelte.svelte';
  import '../../components/tiles/RTile2.js';

  let tileListRenderer: any;
  let container: HTMLElement;

  let testData: string[] = [
    'T\ta|elementType:div|resize:true|resizeEdges:all|\ts|height:100vh|width:100vw|background:rgb((34,34,34)|position:absolute|\t',
  	' T\ta|elementType:div|displayType:text|drag:true|resize:true|resizeEdges:all|\ts|height:200px|width:200px|background:blue|position:absolute|top:100px|left:100px|\t',
  	'  T\ta|elementType:div|drag:true|resize:true|resizeEdges:all|\ts|height:100px|width:100px|background:green|position:absolute|top:50px|left:50px|\t',
	];

  onMount(() => {
    if (container) {
      const tileList = new RS1.TileList(testData);
      tileListRenderer = document.createElement('tilelist-renderer');
      tileListRenderer.TList = tileList;
      container.appendChild(tileListRenderer);
    }
  });
</script>

<div class="test-container" bind:this={container}></div>

<style>
  .test-container {
    height: 100vh;
    width: 100vw;
  }
</style>
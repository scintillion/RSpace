<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';

	const TileStrings: string[] = [
		'TS3:SampleTiles',
		'T\ta|name:grid|\ts|display:grid|grid-template-columns:repeat(auto-fill, minmax(200px, 1fr))|gap:20|width:100%|padding:40px 24px|box-sizing:border-box|\t',
		' T\ta|name:basic-div|inner:Basic Div|\ts|width:200|height:200|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|\t',
		' T\ta|name:basic-button|inner:Basic Button|element:button|\ts|width:200|height:200|background:#f093fb|color:white|border:none|border-radius:8|cursor:pointer|font-size:16|\t',
		' T\ta|name:redirect-tile|inner:Redirect|clickAction:Redirect|redirect:https://google.com|\ts|width:200|height:200|background:#4facfe|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|\t',
		' T\ta|name:alert-tile|inner:Alert|clickAction:Alert|alertContent:Hello! This is an alert!|\ts|width:200|height:200|background:#fa709a|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|\t',
		' T\ta|name:villalink-tile|inner:VillaLink|clickAction:VillaLink|link:SampleVilla|\ts|width:200|height:200|background:#30cfd0|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|\t',
		' T\ta|name:bold-tile|inner:B|clickAction:Bold|\ts|width:200|height:200|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|font-weight:bold|font-size:48|\t',
		' T\ta|name:italic-tile|inner:I|clickAction:Italic|\ts|width:200|height:200|background:#764ba2|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|font-style:italic|font-size:48|\t',
		' T\ta|name:underline-tile|inner:U|clickAction:Underline|\ts|width:200|height:200|background:#f093fb|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:pointer|text-decoration:underline|font-size:48|\t',
		' T\ta|name:drag-xy|inner:Drag XY|drag:true|dragAxis:xy|\ts|width:200|height:200|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:move|position:relative|\t',
		' T\ta|name:drag-x|inner:Drag X|drag:true|dragAxis:x|\ts|width:200|height:200|background:#f093fb|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:move|position:relative|\t',
		' T\ta|name:drag-y|inner:Drag Y|drag:true|dragAxis:y|\ts|width:200|height:200|background:#4facfe|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|cursor:move|position:relative|\t',
		' T\ta|name:resize-tile|inner:Resize|resize:true|\ts|width:200|height:200|background:#fa709a|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|position:relative|\t',
		' T\ta|name:drag-resize-tile|inner:Drag & Resize|drag:true|resize:true|\ts|width:200|height:200|background:#30cfd0|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|position:relative|cursor:move|\t',
		' T\ta|name:hover-tile|inner:Hover|hover:true|\ts|width:200|height:200|background:#ff9a9e|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|transition:all 0.3s ease|\t',
		' T\ta|name:edit-text-preview|inner:Edit Text|innerEdit:true|textPreview:true|\ts|width:200|height:200|background:#a1c4fd|color:#333|display:flex|align-items:center|justify-content:center|border-radius:8|padding:10|\t',
		' T\ta|name:edit-text-always|inner:Always Edit|innerEdit:true|textPreview:false|\ts|width:200|height:200|background:#fad0c4|color:#333|display:flex|align-items:center|justify-content:center|border-radius:8|padding:10|\t',
		' T\ta|name:bg-image-tile|inner:BG Image|BgImage:true|\ts|width:200|height:200|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|position:relative|\t',
		' T\ta|name:delete-tile|inner:Delete|\ts|width:200|height:200|background:#f093fb|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|position:relative|\t',
		' T\ta|name:full-featured|inner:Full Featured|drag:true|resize:true|hover:true|clickAction:Alert|alertContent:Full featured tile!|\ts|width:200|height:200|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8|position:relative|cursor:move|\t'
	];

	const List: RS1.TileList = new RS1.TileList(TileStrings);
	let plotter: Plotter | null = null;

	onMount(() => {
		const container = document.querySelector('.tiles');
		if (container) {
			plotter = new Plotter(List, container as HTMLDivElement);
			plotter.PlotTiles();
		}
	});

	onDestroy(() => {
		if (plotter) {
			plotter.destroy();
		}
	});
</script>

<div class="full-page">
	<div class="tiles tile-grid"></div>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow-x: hidden;
	}

	:global(body) {
		background: #f5f5f5;
	}

	:global(#svelte),
	:global(.container),
	:global(main) {
		width: 100%;
		min-height: 100vh;
		margin: 0;
		padding: 0;
	}

	.full-page {
		width: 100%;
		min-height: 100vh;
		box-sizing: border-box;
		overflow-y: auto;
	}

	/* Container holds the grid wrapper tile; grid layout comes from first tile's styles */
	.tiles.tile-grid {
		width: 100%;
		padding: 40px 24px;
	}
</style>

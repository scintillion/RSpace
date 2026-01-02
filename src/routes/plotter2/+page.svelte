<script lang="ts">
	import { onMount } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';

	const TileStrings: string[] = [
		'TS:TileShowcase',
		// All tiles are top-level - grid layout applied via CSS to .tiles container
		
		// Basic Tiles
		'T\ta|name:BasicDiv|inner:Basic Div|\ts|width:200px|height:200px|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|\t',
		'T\ta|name:BasicButton|inner:Basic Button|\ts|width:200px|height:200px|background:#f093fb|color:white|border:none|border-radius:8px|cursor:pointer|font-size:16px|\t',
		
		// Click Actions
		'T\ta|name:RedirectTile|inner:Redirect|clickAction:Redirect|redirect:https://google.com|\ts|width:200px|height:200px|background:#4facfe|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|\t',
		'T\ta|name:AlertTile|inner:Alert|clickAction:Alert|alertContent:Hello! This is an alert!|\ts|width:200px|height:200px|background:#fa709a|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|\t',
		'T\ta|name:VillaLinkTile|inner:VillaLink|clickAction:VillaLink|link:SampleVilla|\ts|width:200px|height:200px|background:#30cfd0|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|\t',
		
		// Text Formatting
		'T\ta|name:BoldTile|inner:B|clickAction:Bold|\ts|width:200px|height:200px|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|font-weight:bold|font-size:48px|\t',
		'T\ta|name:ItalicTile|inner:I|clickAction:Italic|\ts|width:200px|height:200px|background:#764ba2|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|font-style:italic|font-size:48px|\t',
		'T\ta|name:UnderlineTile|inner:U|clickAction:Underline|\ts|width:200px|height:200px|background:#f093fb|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:pointer|text-decoration:underline|font-size:48px|\t',
		
		// Drag & Drop
		'T\ta|name:DragXY|inner:Drag XY|drag:true|dragAxis:xy|\ts|width:200px|height:200px|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:move|position:relative|\t',
		'T\ta|name:DragX|inner:Drag X|drag:true|dragAxis:x|\ts|width:200px|height:200px|background:#f093fb|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:move|position:relative|\t',
		'T\ta|name:DragY|inner:Drag Y|drag:true|dragAxis:y|\ts|width:200px|height:200px|background:#4facfe|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|cursor:move|position:relative|\t',
		
		// Resize
		'T\ta|name:ResizeTile|inner:Resize|resize:true|\ts|width:200px|height:200px|background:#fa709a|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|position:relative|\t',
		'T\ta|name:DragResizeTile|inner:Drag & Resize|drag:true|resize:true|\ts|width:200px|height:200px|background:#30cfd0|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|position:relative|cursor:move|\t',
		
		// Hover
		'T\ta|name:HoverTile|inner:Hover|hover:true|\ts|width:200px|height:200px|background:#ff9a9e|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|transition:all 0.3s ease|\t',
		
		// Text Editing
		'T\ta|name:EditTextPreview|inner:Edit Text|innerEdit:true|textPreview:true|\ts|width:200px|height:200px|background:#a1c4fd|color:#333|display:flex|align-items:center|justify-content:center|border-radius:8px|padding:10px|\t',
		'T\ta|name:EditTextAlways|inner:Always Edit|innerEdit:true|textPreview:false|\ts|width:200px|height:200px|background:#fad0c4|color:#333|display:flex|align-items:center|justify-content:center|border-radius:8px|padding:10px|\t',
		
		// Background Image
		'T\ta|name:BgImageTile|inner:BG Image|BgImage:true|\ts|width:200px|height:200px|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|position:relative|\t',
		
		// Button types (using tileType)
		'Btn\ta|name:ButtonTile|inner:Button|\ts|width:200px|height:200px|background:#667eea|color:white|border:none|border-radius:8px|\t',
		'RndBtn\ta|name:RoundButtonTile|inner:Round Button|\ts|width:200px|height:200px|background:#f093fb|color:white|border:none|\t',
		
		// Full Featured
		'T\ta|name:FullFeatured|inner:Full Featured|drag:true|resize:true|hover:true|clickAction:Alert|alertContent:Full featured tile!|\ts|width:200px|height:200px|background:#667eea|color:white|display:flex|align-items:center|justify-content:center|border-radius:8px|position:relative|cursor:move|\t'
	];

	const List: RS1.TileList = new RS1.TileList(TileStrings);

	onMount(() => {
		let tiles = document.querySelector('.tiles');
		if (tiles) {
			const plotter: Plotter = new Plotter(List, tiles as HTMLDivElement);
			plotter.PlotTiles();
		}
	});
</script>

<div class="tiles">
	<!-- rendered html from plotter goes here -->
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

	/* If using SvelteKit layout wrappers */
	:global(#svelte),
	:global(.container),
	:global(main) {
		width: 100%;
		min-height: 100vh;
		margin: 0;
		padding: 0;
	}

	.tiles {
		width: 100%;
		min-height: 100vh;
		padding: 40px 24px;
		box-sizing: border-box;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 20px;
	}

	@media (max-width: 768px) {
		.tiles {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 15px;
		}
	}
</style>

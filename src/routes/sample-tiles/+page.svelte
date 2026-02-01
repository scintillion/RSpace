<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';
	import TileEditorModal from './TileEditorModal.svelte';

	const initialTileStrings: string[] = [
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

	// TileStrings[0] = header, TileStrings[1..] = data rows; DOM id tile-N === TileStrings[N]
	let TileStrings = $state([...initialTileStrings]);
	let tilesContainer = $state<HTMLDivElement | null>(null);
	let plotter: Plotter | null = null;

	let dialogOpen = $state(false);
	/** Index into TileStrings (1 = first data tile; 0 is header) */
	let selectedTileIndex = $state(1);
	let editingTypePart = $state('');
	let editingAList = $state('');
	let editingSList = $state('');

	function parseTileLine(line: string): { typePart: string; aList: string; sList: string } {
		const parts = line.split('\t');
		const typePart = parts[0] ?? '';
		const aList = parts[1] ?? '';
		const sList = parts[2] ?? '';
		return { typePart: typePart || 'T', aList, sList };
	}

	function buildTileLine(typePart: string, aList: string, sList: string): string {
		const typeWithIndent = (typePart && typePart.trim()) ? typePart : 'T';
		return `${typeWithIndent}\t${aList}\t${sList}\t`;
	}

	function openTileEditor(domTileIndex: number) {
		// list.tiles[0] is unused; list.tiles[1]=TileStrings[1], list.tiles[2]=TileStrings[2], ... so DOM id tile-N === TileStrings[N]
		const tileStringsIndex = domTileIndex;
		const line = TileStrings[tileStringsIndex];
		if (line == null) return;
		selectedTileIndex = tileStringsIndex;
		const { typePart, aList, sList } = parseTileLine(line);
		editingTypePart = typePart || 'T';
		editingAList = aList;
		editingSList = sList;
		dialogOpen = true;
	}

	function handleContextMenu(e: MouseEvent) {
		const el = (e.target as HTMLElement).closest?.('[id^="tile-"]') as HTMLElement | null;
		if (!el) return;
		e.preventDefault();
		const id = el.getAttribute('id') ?? '';
		const match = id.match(/^tile-(\d+)$/);
		if (match) {
			const domIndex = parseInt(match[1], 10);
			openTileEditor(domIndex);
		}
	}

	function applyEdit(typePart: string, aList: string, sList: string) {
		const line = buildTileLine(typePart, aList, sList);
		TileStrings = TileStrings.with(selectedTileIndex, line);
		closeDialog();
	}

	function closeDialog() {
		dialogOpen = false;
	}

	// React to TileStrings and container: replot whenever either is ready/updated (single source of truth for grid DOM)
	$effect(() => {
		const container = tilesContainer;
		const strings = TileStrings;
		if (!container || !strings.length) return;
		if (plotter) {
			plotter.destroy();
			plotter = null;
		}
		container.innerHTML = '';
		const list = new RS1.TileList(strings);
		plotter = new Plotter(list, container);
		plotter.PlotTiles();
		return () => {
			if (plotter) {
				plotter.destroy();
				plotter = null;
			}
		};
	});

	onDestroy(() => {
		if (plotter) {
			plotter.destroy();
			plotter = null;
		}
	});
</script>

<div
	class="w-full min-h-full min-w-0 flex-1 box-border overflow-y-auto bg-[#1e1e1e] flex flex-col"
	role="region"
	aria-label="Sample tiles"
	oncontextmenu={handleContextMenu}
>
	<div class="tiles tile-grid w-full py-10 px-6" bind:this={tilesContainer}></div>

	{#if dialogOpen}
		<TileEditorModal
			selectedTileIndex={selectedTileIndex}
			initialTypePart={editingTypePart}
			initialAList={editingAList}
			initialSList={editingSList}
			buildTileLine={buildTileLine}
			onClose={closeDialog}
			onApply={applyEdit}
		/>
	{/if}
</div>


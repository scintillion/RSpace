<script lang="ts">
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RS';

	interface Props {
		selectedTileIndex: number;
		initialTypePart: string;
		initialAList: string;
		initialSList: string;
		buildTileLine: (typePart: string, aList: string, sList: string) => string;
		onClose: () => void;
		onApply: (typePart: string, aList: string, sList: string) => void;
	}

	let {
		selectedTileIndex,
		initialTypePart,
		initialAList,
		initialSList,
		buildTileLine,
		onClose,
		onApply
	}: Props = $props();

	// Intentionally use initial props only at mount (modal owns state after that)
	// svelte-ignore state_referenced_locally
	let editingTypePart = $state(initialTypePart);
	// svelte-ignore state_referenced_locally
	let editingAList = $state(initialAList);
	// svelte-ignore state_referenced_locally
	let editingSList = $state(initialSList);

	const editingTileLine = $derived(buildTileLine(editingTypePart, editingAList, editingSList));

	let previewContainer = $state<HTMLDivElement | null>(null);
	let previewPlotter: Plotter | null = null;

	// Real-time preview
	$effect(() => {
		const line = buildTileLine(editingTypePart, editingAList, editingSList);
		const container = previewContainer;
		if (!container) return;
		const id = requestAnimationFrame(() => {
			if (previewPlotter) {
				previewPlotter.destroy();
				previewPlotter = null;
			}
			container.innerHTML = '';
			try {
				const list = new RS1.TileList(['TS3:Preview', line]);
				previewPlotter = new Plotter(list, container);
				previewPlotter.PlotTiles();
			} catch (_) {}
		});
		return () => {
			cancelAnimationFrame(id);
			if (previewPlotter) {
				previewPlotter.destroy();
				previewPlotter = null;
			}
		};
	});

	function handleApply() {
		onApply(editingTypePart, editingAList, editingSList);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-5 box-border"
	role="dialog"
	aria-modal="true"
	aria-label="Edit tile"
	tabindex="-1"
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
>
	<div
		class="bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] max-w-[900px] w-full max-h-[90vh] flex flex-col mx-4 overflow-hidden"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between py-2.5 px-2.5 border-b border-[#ddd]">
			<h2 class="m-0 text-base font-semibold text-[#333]">Edit tile (tile-{selectedTileIndex})</h2>
			<button
				type="button"
				class="w-8 h-8 flex items-center justify-center rounded-lg text-[#333] cursor-pointer border-none bg-transparent text-xl leading-none hover:bg-[#f5f5f5] transition-[background-color] duration-200"
				onclick={() => onClose()}
				aria-label="Close"
			>×</button>
		</div>

		<div class="overflow-y-auto flex-1 flex flex-col gap-4 p-2.5">
			<section class="flex flex-col gap-2.5">
				<h3 class="m-0 text-sm font-medium text-[#333]">Preview</h3>
				<div
					class="min-h-[180px] rounded-lg border border-[#ddd] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center p-2.5 box-border"
					bind:this={previewContainer}
				></div>
			</section>

			<section class="flex flex-col gap-4">
				<h3 class="m-0 text-sm font-medium text-[#333]">Tile string</h3>
				<input
					type="text"
					class="w-full h-8 px-2.5 font-mono text-xs border border-[#ddd] rounded-lg bg-[#f5f5f5] text-[#333] box-border outline-none transition-[border-color,box-shadow] duration-300 cursor-not-allowed"
					readonly
					disabled
					value={editingTileLine}
					aria-label="Full tile string (read-only)"
				/>

				<div class="flex flex-col gap-2.5">
					<label for="tile-type" class="text-sm font-medium text-[#333]">Type (indent + name)</label>
					<input
						id="tile-type"
						type="text"
						class="w-full h-8 px-2.5 font-mono text-sm border border-[#ddd] rounded-lg bg-white text-black box-border outline-none transition-[border-color,box-shadow] duration-300 focus:border-[#3297FD] focus:shadow-[0_0_0_2px_rgba(50,151,253,0.2)]"
						bind:value={editingTypePart}
						placeholder="T or  T"
						aria-label="Tile type and indent"
					/>
				</div>

				<div class="flex flex-col gap-2.5">
					<label for="tile-alist" class="text-sm font-medium text-[#333]">a list (attributes)</label>
					<textarea
						id="tile-alist"
						class="w-full min-h-[72px] px-2.5 py-2 font-mono text-sm border border-[#ddd] rounded-lg bg-white text-black box-border resize-y outline-none transition-[border-color,box-shadow] duration-300 focus:border-[#3297FD] focus:shadow-[0_0_0_2px_rgba(50,151,253,0.2)]"
						bind:value={editingAList}
						rows="3"
						placeholder="a|name:value|..."
						aria-label="Attribute list"
					></textarea>
				</div>

				<div class="flex flex-col gap-2.5">
					<label for="tile-slist" class="text-sm font-medium text-[#333]">s list (styles)</label>
					<textarea
						id="tile-slist"
						class="w-full min-h-[72px] px-2.5 py-2 font-mono text-sm border border-[#ddd] rounded-lg bg-white text-black box-border resize-y outline-none transition-[border-color,box-shadow] duration-300 focus:border-[#3297FD] focus:shadow-[0_0_0_2px_rgba(50,151,253,0.2)]"
						bind:value={editingSList}
						rows="4"
						placeholder="s|width:200|..."
						aria-label="Style list"
					></textarea>
				</div>
			</section>
		</div>

		<div class="flex flex-wrap justify-end gap-2.5 py-2.5 px-2.5 border-t border-[#ddd]">
			<button
				type="button"
				class="h-8 min-w-[80px] px-4 rounded-lg text-sm font-medium border-none cursor-pointer bg-black text-white outline-none transition-[background-color] duration-300 hover:bg-[#3297FD]"
				onclick={() => onClose()}
			>Cancel</button>
			<button
				type="button"
				class="h-8 min-w-[80px] px-4 rounded-lg text-sm font-medium border-none cursor-pointer bg-black text-white outline-none transition-[background-color] duration-300 hover:bg-[#3297FD]"
				onclick={() => handleApply()}
			>Apply</button>
		</div>
	</div>
</div>

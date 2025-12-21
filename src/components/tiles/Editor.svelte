<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '$lib/ConstListEditor';
	import { RS1 } from '../../lib/RS';
	import { packStore } from '../../stores/packStore.js';
	import { createEventDispatcher } from 'svelte';

	let {
		CLString = '',
		Pack
	}: {
		CLString: string;
		Pack: RS1.BufPack;
	} = $props();

	let receivedPack: RS1.BufPack;

	const SpecialData: RS1.vList = new RS1.vList();
	const LoL: RS1.LoL = new RS1.LoL();
	const TypeArray = RS1.TypeNames;

	const dispatch = createEventDispatcher<{
		close: void;
		save: { value: RS1.BufPack };
	}>();

	function close() {
		dispatch('close');
		dispatch('save', { value: receivedPack });
	}

	let unsubscribe: () => void;

	onMount(() => {
		// Load pack data
		SpecialData.PostLoad(Pack);
		CLString = SpecialData.qstr;

		// Store subscription
		unsubscribe = packStore.subscribe((value) => {
			receivedPack = value;
		});

		// Editor init
		const container = document.getElementById('cledit') as HTMLDivElement | null;
		if (container) {
			const list = new RS1.vList(CLString);
			const editor = new Editor(container, list, LoL);
			editor.Populate();
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

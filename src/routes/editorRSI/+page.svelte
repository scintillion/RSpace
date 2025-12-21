<script lang="ts">
	import { onMount } from 'svelte';
	import { mount } from 'svelte';
	import RSIEditor from '../../components/tiles/EditorRSI.svelte';
	import { RS1 } from '../../lib/RS';

	let CLString =
		'Test|Name:[%=John]Your Name|XY:[#=123]A Number Value|Member:[@Test1=ListNum]TestMem|Set:[{Test1=ListNum,Test1Name}]TestSet|';

	let RSI = new RS1.RSI(CLString);

	onMount(() => {
		// Create modal container AFTER DOM is available
		const modalContent = document.createElement('div');

		modalContent.style.position = 'absolute';
		modalContent.style.top = '40%';
		modalContent.style.left = '50%';
		modalContent.style.transform = 'translate(-50%, -50%)';
		modalContent.style.backgroundColor = 'rgba(249, 240, 246)';
		modalContent.style.padding = '20px';
		modalContent.style.borderRadius = '5px';
		modalContent.style.zIndex = '1';

		document.body.appendChild(modalContent);

		// Mount Svelte component programmatically
		const editor = mount(RSIEditor, {
			target: modalContent,
			props: {
				rsi: RSI,
				modalContent,
                onSave: (editedRSI) => {
                  console.log(editedRSI)
                },
			}
		});

		// Optional cleanup hook
		//return () => {
		//	modalContent.remove();
		//};
	});
</script>


<!-- <QEditor {CLString} /> -->

<!-- <div class="modal-content" /> -->



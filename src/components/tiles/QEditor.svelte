<script lang="ts">
	import { QEditor } from '$lib/qListEditor';
	import { RS1 } from '$lib/RSsvelte.svelte';
	import { createEventDispatcher } from 'svelte';
	
	let CLString = $state('');
	
	let { modalContent, modalBackground, qList } = $props<{
		modalContent: HTMLElement,
		modalBackground: HTMLDivElement,
		qList: RS1.qList
	}>();

	const TypeArray = RS1.TypeNames;
	const dispatch = createEventDispatcher();

	function close() {
		// modalContent?.remove();
		// modalBackground?.remove();
		dispatch('close');
	}

	const rList = $state(new RS1.rList());

	$effect(() => {
		const container = document.getElementById('cledit') as HTMLDivElement | null;

		if (container) {
			const edit: QEditor = new QEditor(container, qList, rList);
			edit.Populate();
		}
	});
</script>

<div class="editor">
	<div id="cledit">
		<div class="selectContainer"></div>
		<div class="VIDOperations">
			<div class="functions" id="Line1">
				<label for="name">Name: </label>
				<input type="text" name="name" placeholder="No Use Unless You Add" />
				<label for="desc">Desc: </label>
				<input type="text" name="desc" />
			</div>
			
			<div class="functions" id="Line2">
				<label for="format">ValueType: </label>
				<select name="format" placeholder="Format" id="format">
					{#each TypeArray as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
				<label for="value">Value:</label>
				<input type="text" name="value" />
				<label for="fmtstr">XtraStr:</label>
				<input type="text" name="fmtstr" />
			</div>
			<div class="buttons">
				<button id="save">Save</button>
				<button id="del">Delete</button>
				<button id="clear">Clear</button>
				<button id="copy">Copy</button>
				<button id="up">Up</button>
				<button id="down">Down</button>
				<button id="add">Add</button>
				<button onclick={close}>Back</button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.editor {
		width: 100%;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;

		#cledit {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			gap: 20px;
			width: 450px;
			height: 100%;
			padding: 10px;

			.selectContainer {
				width: 100%;
				height: auto;
				max-height: 500px; 
				overflow-y: auto;
			}

			.VIDOperations {
				width: 100%;
				display: flex;
				justify-content: center;
				flex-direction: column;
				
				.functions {
					align-items: center;
					justify-content: center;
					display: flex;
					flex-direction: column;
					gap: 5px;
				}

				.buttons {
					button {
						margin-top: 10px;
						width: 80px;
						height: 32px;
						border-radius: 8px;
						font-family: inherit;
						background: black;
						outline: none;
						border: none;
						cursor: pointer;
						color: white;
						transition: 0.3s linear;
					}
				}
			}

			input,
			select {
				width: 100%;
				height: 32px;
				border-radius: 8px;
				font-family: inherit;
				outline: none;
				border: none;
				padding-left: 5px;
				transition: 0.3s linear;
			}
		}
	}
</style>
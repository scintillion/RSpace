<script lang="ts">
    import { RS1 } from '$lib/RS';
	import QEditor from '../components/tiles/QEditor.svelte';
	import RListEditor from './rListEditor.svelte';
	
    export let RSD: RS1.RSD;
	let leafArray = RSD.Tree?.Leafs;
	let selectedLeaf: Type;
	let root: Type;
	const Str: string = '>'
	let step = 'Home';

	type Type = RS1.RSLeaf

	function selectLeaf(leaf:Type) {
		if (leaf.level > 1) {
			step = 'edit';
		}
		selectedLeaf = leaf;
		leafArray = RSD.Tree?.Leafs;
	}

	function copyVID(leaf: Type) {
		let newqList = new RS1.qList();
		let newrList = new RS1.rList();
		
		if (leaf.D instanceof RS1.qList) {
			newqList = leaf.D.copy;
			RSD.kidAdd(newqList);
		}
		else if (leaf.D instanceof RS1.rList) {
			newrList = leaf.D.copy;
			RSD.kidAdd(newrList);
		}
		else {
			throw new Error('undefined');
		}
		
		leafArray = RSD.Tree?.Leafs;
			
		}

		function edit(list: Type) {
			
			if (list.D instanceof RS1.qList) {
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

				if (modalContent) {
					const editorComponent = new QEditor({
							target: modalContent,
							props: {
								qList: list.D,
							},
						});
						editorComponent.$on('close', () => {
						modalContent.remove();
					});
				}
    		}
			
			else  {
				const modalContent = document.getElementById('editor');
								
				if(modalContent) {
					modalContent.innerHTML = '';
				
					const editorComponent = new RListEditor({
						target: modalContent,
						props: {
							RSD: list.D,
						}
					});
				}
			}

			// else {
			// 	throw new Error('Invalid list. Please select a list');
			// }
	
		}

		// function handleBack(list: Type) {
		// 	let parent
		// 	console.log('parent' + list?.D.Name)
		// 	if (rListArray) {
		// 		parent = rListArray[list?.parent]
		// 	}
			
		// 	if (parent) {
		// 		selectLeaf(parent);
		// 	}
		// 	else {
		// 		console.log('no parent')
		// 	}
			
		// }

		// function handleBack() {
		// 	let parent: Type
		// 	console.log('parent' + selectedLeaf?.parent)
		// 	console.log('level' + selectedLeaf?.level)
		// 	if (rListArray) {
		// 		parent = rListArray[selectedLeaf?.parent-1]
		// 		if (parent) 
		// 			selectLeaf(parent);
			
		// 	}
		// 	else {
		// 		console.log('no parent')
		// 	}
		// }



</script>

<main>
	<div id="editor">
        <div class="selectContainer">
			{#if leafArray}
				{#each leafArray as leaf}
					{#if step === 'Home'}
						{#if leaf.level === 1}
							<div on:click={() => selectLeaf(leaf)} class:selected={leaf === selectedLeaf} >
								<span>{leaf.D?.Name} lvl - {leaf.level} parent - {leaf.parent} </span>
							</div>
						{/if}
					{/if}
					{#if step === 'edit'}
						{#if leaf}
							<div on:click={() => selectLeaf(leaf)} class:selected={leaf === selectedLeaf} >
								<span>{leaf.D?.Name} lvl - {leaf.level} parent - {leaf.parent}</span>
							</div>
						{/if}
					{/if}
				{/each}
			{/if}
        </div>
		
		<div class="Buttons">
			<!-- <button id="save">Save</button> -->
			<button id="edit" on:click={() => edit(selectedLeaf)}>Edit</button>
			<button id="del" on:click={() => {RSD.kidDel(selectedLeaf.D); leafArray = RSD.Tree?.Leafs; }}>Delete</button>
			<!-- <button id="clear">Clear</button> -->
			<button id="copy" on:click={() => copyVID(selectedLeaf)}>Copy</button>
			<button id="up" on:click={() => {RSD.K?.bubble(selectedLeaf.D,-1); leafArray = RSD.Tree?.Leafs; }}>Up</button>
			<button id="down" on:click={() => {RSD.K?.bubble(selectedLeaf.D,1); leafArray = RSD.Tree?.Leafs; }}>Down</button>
			<!-- <button id="add">Add</button> -->
			<!-- <button id="back" on:click={() => handleBack()}>Back</button> -->
			</div>
			
		</div>
</main>		
		
			


<style lang="scss">
	.selectContainer {
        width: 100%;
        height: auto;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        max-height: 500px;
        overflow-y: auto;
        gap: 10px;
        background-color: white;
        color: black;
    }
    .selectContainer div {
        cursor: pointer;
        padding: 2px;
        margin-bottom: 4px;
        border-radius: 4px;
        transition: background-color 0.3s ease;
    }

    .selectContainer div:hover,
    .selectContainer div.selected {
        background-color: #3297FD;
        color: white;
    }
   
    button {
		margin-top:   10px;
		width:   80px;
		height:   32px;
		border-radius:   8px;
		font-family: inherit;
		background: black;
		outline: none;
		border: none;
		cursor: pointer;
		color: white;
		transition:   0.3s linear;
   }
	
   #editor {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;
		width: 450px;
		height: 100%;
		padding: 10px;
   }
	
</style>
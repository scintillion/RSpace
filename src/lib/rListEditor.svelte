<script lang="ts">
    import { RS1 } from '$lib/RS';
	import QEditor from '../components/tiles/QEditor.svelte';
	import RListEditor from './rListEditor.svelte';
	
    export let RSK: RS1.RSK;
	let kidArray = RSK._kids
	let selectedKid: Types
	let step = 'Home';
	if (kidArray.length > 0 && kidArray[0]) 
    	selectedKid = kidArray[0];

	type Types = RS1.RSD;

	function selectKid(kid:Types | undefined) {
		console.log('select!')
		if (kid?.mom) {
			step = 'edit';
		}
		if (kid) selectedKid = kid;
		console.log('selectKid()' + selectedKid.Desc)
	}

	function copyVID(kid: Types) {
		let newqList = new RS1.qList();
		let newrList = new RS1.rList();
		
		if (kid instanceof RS1.qList) {
			newqList = kid.copy;
			RSK.add(newqList);
		}
		else if (kid instanceof RS1.rList) {
			newrList = kid.copy;
			RSK.add(newrList);
		}
		else {
			throw new Error('undefined');
		}
		
		kidArray = RSK._kids;
			
		}

		function edit(list: Types) {
			console.log('Edit!')
			
			if (list instanceof RS1.qList) {
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
								qList: list,
							},
						});
						editorComponent.$on('close', () => {
						modalContent.remove();
					});
				}
    		}
			
			else  {
				const modalContent = document.getElementById('editor');
				console.log('Edit' + selectedKid?.Desc)
								
				if(modalContent) {
					modalContent.innerHTML = '';

					if (list?.K) {
					const editorComponent = new RListEditor({
						target: modalContent,
						props: {
							RSK: list.K,
						}
					});
				}
				}
			}

			// else {
			// 	throw new Error('Invalid list. Please select a list');
			// }
	
		}

		function handleBack() {
			let parent: RS1.RSD | undefined
			console.log('handleBack()' + selectedKid?.Desc)
			parent = selectedKid?.mom
			if (!parent?.mom) return
			
			selectKid(parent.mom);
			
			if (selectedKid.K) RSK = selectedKid.K
			kidArray = RSK._kids
		}



</script>

<main>
	<div id="editor">
        <div class="selectContainer">
			{#if kidArray}
				{#each kidArray as kid}
					{#if step === 'Home'}
							<div on:click={() => selectKid(kid)} class:selected={kid === selectedKid} >
								<span>{kid?.Name} </span>
							</div>
					{/if}
					{#if step === 'edit'}
						{#if kid}
							<div on:click={() => selectKid(kid)} class:selected={kid === selectedKid} >
								<span>{kid?.Name}</span>
							</div>
						{/if}
					{/if}
				{/each}
			{/if}
        </div>
		
		<div class="Buttons">
			<!-- <button id="save">Save</button> -->
			<button id="edit" on:click={() => edit(selectedKid)}>Edit</button>
			<button id="del" on:click={() => {RSK.del(selectedKid); kidArray = RSK._kids }}>Delete</button>
			<!-- <button id="clear">Clear</button> -->
			<button id="copy" on:click={() => copyVID(selectedKid)}>Copy</button>
			<button id="up" on:click={() => {RSK.bubble(selectedKid,-1);  kidArray = RSK._kids }}>Up</button>
			<button id="down" on:click={() => {RSK.bubble(selectedKid,1); kidArray = RSK._kids }}>Down</button>
			<!-- <button id="add">Add</button> -->
			<button id="back" on:click={() => handleBack()}>Back</button>
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
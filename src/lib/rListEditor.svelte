<script lang="ts">
    import { RS1 } from './RS';
	import QEditor from '../components/tiles/QEditor.svelte';
	import RListEditor from './rListEditor.svelte';
	import { mount } from 'svelte';

    // export let RSK: RS1.RSK;
	let {RSK}:{RSK: RS1.RSK} = $props();
	// let {RSK}:{RSK: RS1.RSK} = $props<{RSK:RS1.RSK}>();
	let kidArray = $state(RSK._kids);
	let selectedKid: Types = $state(kidArray[0]) ;
	let step = $state('Home');

	type Types = RS1.RSD | undefined;

	function selectKid(kid:Types) {
		console.log('select!')
		if (kid?.Mom) {
			step = 'edit';
		}
		if (kid) selectedKid = kid;
		console.log('selectKid()' + selectedKid?.Desc)
	}

	function copyVID(kid: Types) {
		let newqList = new RS1.qList();
		let newrList = new RS1.rList();
		
		if (kid instanceof RS1.qList) {
			newqList = kid.copy ();
			RSK.add(newqList);
		}
		else if (kid instanceof RS1.rList) {
			newrList =  kid.copy ();
			RSK.add(newrList);
		}
		else {
			throw new Error('undefined');
		}
		
			
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
					const editorComponent = mount (QEditor,({
							target: modalContent,
							props: {
								qList: list,
								modalBackground: modalContent,
								modalContent: modalContent,
							},
						}));
					// 	editorComponent.$on('close', () => {
					// 	modalContent.remove();
					// });
				}
    		}
			
			else  {
				const modalContent = document.getElementById('editor');
				console.log('Edit' + selectedKid?.Desc)
								
				if(modalContent) {
					modalContent.innerHTML = '';

					if (list?.K) {
					const editorComponent = mount( RListEditor,({
						target: modalContent,
						props: {
							RSK: list.K,
						}
					}));
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
			parent = selectedKid?.Mom
			if (!parent?.Mom) return
			
			selectKid(parent.Mom);

			if (selectedKid?.K) RSK = selectedKid.K
			// kidArray = RSK._kids
		}

		function del() {
			if (selectedKid) { 
				// let storearray = kidArray; 
				RSK.del(selectedKid);
			}
		}
		
	


</script>

{#snippet selectBox(kid : RS1.RSD)}
	<button onclick={() => selectKid(kid)} class:selected={kid === selectedKid} >
		<span>{kid?.Name} </span>
	</button>
{/snippet}	

<main>
	<div id="editor">
        <div class="selectContainer">
			{#if kidArray}
				{#each kidArray as kid}
					{#if step === 'Home'}
							{@render selectBox(kid)}
					{/if}
					{#if step === 'edit'}
						{#if kid}
							{@render selectBox(kid)}
						{/if}
					{/if}
				{/each}
			{/if}
        </div>
		
		<div class="Buttons">
			<!-- <button id="save">Save</button> -->
			<button id="edit" onclick={() => edit(selectedKid)}>Edit</button>
			<button id="del" onclick={() => del()}>Delete</button>
			<!-- <button id="clear">Clear</button> -->
			<button id="copy" onclick={() => copyVID(selectedKid)}>Copy</button>
			<button id="up" onclick={() => {if (selectedKid) RSK.bubble(selectedKid,-1);}}>Up</button>
			<button id="down" onclick={() => {if (selectedKid) RSK.bubble(selectedKid,1);}}>Down</button>
			<!-- <button id="add">Add</button> -->
			<button id="back" onclick={() => handleBack()}>Back</button>
			</div>
			
		</div>
</main>		
		
			


<style lang="scss">
	main {
	  #editor {
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
		  padding: 10px;
		  border-radius: 8px;
		  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		  max-height: 500px;
		  overflow-y: auto;
		  background-color: white;
		  color: black;
		  display: flex;
		  flex-direction: column;
		  gap: 4px;
  
		  button {
			cursor: pointer;
			padding: 2px;
			border-radius: 4px;
			margin-bottom: 4px;
			transition: background-color 0.3s ease;
			width: 100%;
			text-align: left;
			background: none;
			border: none;
			font-family: inherit;
			font-size: inherit;
			color: inherit;
			display: block;
  
			&:hover,
			&.selected {
			  background-color: #3297FD;
			  color: white;
			}
		  }
		}
  
		.Buttons {
		  display: flex;
		  flex-wrap: wrap;
		  gap: 10px;
		  justify-content: center;
  
		  button {
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
	}
  </style>
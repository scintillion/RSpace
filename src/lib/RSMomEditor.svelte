<script lang="ts">
    import { RS1 } from './RSsvelte.svelte';
	import RSIEditor from '../components/tiles/EditorRSI.svelte';
	import RSDEditor from './RSDEditor.svelte';
	import { mount } from 'svelte';

    let {RSMom}:{RSMom: RS1.RSMom} = $props();
	// let {RSK}:{RSK: RS1.RSK} = $props<{RSK:RS1.RSK}>();
    let RSK = RSMom.K;
    let kidArray = $state(RSK._kids);
	let selectedKid: Types = $state() ;
	let step = $state('Home');
	let RSD: RS1.RSD = $state(new RS1.RSD());
	let currentRSMom = RSMom;

	type Types = RS1.RSD | undefined;

	function selectKid(kid:Types | undefined) {
		console.log('select!')
		if (kid?.Mom) {
			step = 'edit';
		}
		if (kid) {
			selectedKid = kid;
			console.log('selectKid() ' + selectedKid?.Desc)
			console.log(selectedKid.Kids.forEach((kid) => console.log(kid.Name)))
		}
		console.log('selectKid()' + selectedKid?.Desc)
	}

	function copyVID(kid: Types) {
		let newRSI = new RS1.RSI();
		let newRSr = new RS1.RSr();
			
		if (kid instanceof RS1.RSI) {
			newRSI = kid.copy;
			RSK?.add(newRSI);
		}
		else if (kid instanceof RS1.RSr) {
			newRSr = kid.copy;
			RSK?.add(newRSr);
		}
		else {
			throw new Error('undefined');
		}
		
			
		}

		function edit(list: Types) {
			console.log('Edit!')
			console.log(list instanceof RS1.RSI)
			console.log(list instanceof RS1.RSr)
			// if (list) currentRSD = list
			
			// if (list instanceof RS1.RSI) {
			// 	const modalContent = document.createElement('div');
			// 	modalContent.style.position = 'absolute';
			// 	modalContent.style.top = '40%';
			// 	modalContent.style.left = '50%';
			// 	modalContent.style.transform = 'translate(-50%, -50%)';
			// 	modalContent.style.backgroundColor = 'rgba(249, 240, 246)';
			// 	modalContent.style.padding = '20px';
			// 	modalContent.style.borderRadius = '5px';
			// 	modalContent.style.zIndex = '1';
			// 	document.body.appendChild(modalContent);

			// 	if (modalContent) {
			// 		const editorComponent = mount (RSIEditor,({
			// 				target: modalContent,
			// 				props: {
			// 					RSI: list,
			// 					modalContent: modalContent,
			// 					onSave:() => handleRSISave(list),
			// 				},
			// 			}));
			// 		// 	editorComponent.$on('close', () => {
			// 		// 	modalContent.remove();
			// 		// });
			// 	}
    		// }
			
			if (selectedKid)  {
				const modalContent = document.getElementById('editor');
				console.log('Edit' + selectedKid?.Desc)
								
				if(modalContent) {
					modalContent.innerHTML = '';

					if (list) {
					const editorComponent = mount( RSDEditor,({
						target: modalContent,
						props: {
							RSD: list,
							currentRSMom: currentRSMom,
						}
					}));
				}
				}
			}

			// else {
			// 	throw new Error('Invalid list. Please select a list');
			// }
	
		}

		function addRSI(selectedKid: Types) {
			console.log('selected RSD' + selectedKid?.Desc)
			if (selectedKid) {
				let newRSI = new RS1.RSI();
				edit(newRSI);
				newRSI = new RS1.RSI();
			}
			
		}

		function addRSr() {
			let newRSr = new RS1.RSr();
			RSMom.kidAdd(newRSr);
			// edit(selectedKid);
			newRSr = new RS1.RSr();
		}
		
		async function handleRSISave(editedRSI: RS1.RSI) {
			console.log('editedRSI' + editedRSI.toRaw)
			selectedKid?.kidAdd(editedRSI);
			console.log(selectedKid?.nKids)
		}

		function handleBack() {
			// let parent: RS1.RSD | undefined
			// console.log('handleBack()' + selectedKid?.Desc)
			// parent = selectedKid?.Mom
			// if (!parent?.Mom) return
			
			// selectKid(parent.Mom);

			// if (selectedKid?.K) RSK = selectedKid.K
			// // kidArray = RSK._kids
		}

		function del() {
			if (selectedKid) { 
				// let storearray = kidArray; 
				RSK?.del(selectedKid);
			}
		}




</script>

{#snippet selectBox(kid)}
	<button onclick={() => selectKid(kid)} class:selected={kid === selectedKid} >
		<span>{kid?.info}</span>
	</button>
{/snippet}	

<main>
	<div id="editor">
		<div>{RSD.cName}</div>
        <div class="selectContainer">
			{#if kidArray}
				{#each kidArray as kid}
					{#if step === 'Home' && kid}
						{@render selectBox(kid)}
					{/if}
					{#if step === 'edit' && kid}
						{@render selectBox(kid)}
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
			<button id="up" onclick={() => {if (selectedKid) RSK?.bubble(selectedKid,-1);}}>Up</button>
			<button id="down" onclick={() => {if (selectedKid) RSK?.bubble(selectedKid,1);}}>Down</button>
			<!-- <button id="add">Add</button> -->
			<!-- <button id="back" onclick={() => handleBack()}>Back</button> -->
			<!-- <button id="addRSI" onclick={() => addRSI(selectedKid)}>Add RSI</button> -->
			<button id="addRSr" onclick={() => addRSr()}>Add RSr</button>
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
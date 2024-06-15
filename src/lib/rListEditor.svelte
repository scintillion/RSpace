<script lang="ts">
    import { RS1 } from '$lib/RS';
	import QEditor from '../components/tiles/QEditor.svelte';
	import RListEditor from './rListEditor.svelte';
	
    export let rList: RS1.rList;
    let rListArray = rList.lists;
	let selectedList: ListTypes;
	type ListTypes = RS1.qList|RS1.rList|undefined;

	function selectList(list:ListTypes) {
		selectedList = list;
	}

	function copyVID(list: ListTypes) {
		let newqList = new RS1.qList();
		let newrList = new RS1.rList();
		
		if (list instanceof RS1.qList) {
			newqList = list.copy;
			rList.add(newqList);
		}
		else if (list instanceof RS1.rList) {
			newrList = list.copy;
			rList.add(newrList);
		}
		else {
			throw new Error('undefined');
		}
		
		rListArray = rList.lists;
			
		}

		function edit(list: ListTypes) {
			
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
			
			else if (list instanceof RS1.rList) {
				const modalContent = document.getElementById('editor');
								
				if(modalContent) {
					modalContent.innerHTML = '';
				
					const editorComponent = new RListEditor({
						target: modalContent,
						props: {
							rList: list,
						}
					});
				}
			}

			else {
				throw new Error('Invalid list. Please select a list');
			}
	
		}



</script>

<main>
	<div id="editor">
        <div class="selectContainer">
			{#each rListArray as list}
				<div on:click={() => selectList(list)} class:selected={list === selectedList} >
					<span>{list?.Name}</span>
				</div>
			{/each}
        </div>
		
		<div class="Buttons">
			<!-- <button id="save">Save</button> -->
			<button id="edit" on:click={() => edit(selectedList)}>Edit</button>
			<button id="del" on:click={() => {rList.del(selectedList); rListArray = rList.lists; }}>Delete</button>
			<!-- <button id="clear">Clear</button> -->
			<button id="copy" on:click={() => copyVID(selectedList)}>Copy</button>
			<button id="up" on:click={() => {rList.bubble(selectedList,-1); rListArray = rList.lists;}}>Up</button>
			<button id="down" on:click={() => {rList.bubble(selectedList,1); rListArray = rList.lists;}}>Down</button>
			<!-- <button id="add">Add</button> -->
			<!-- <button>Back</button> -->
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

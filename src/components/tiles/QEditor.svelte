<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '$lib/ConstListEditor';
	import { QEditor } from '$lib/qListEditor';
	import { RS1 } from '../../lib/RS';
	import { packStore } from '../../stores/packStore.js';
	import { createEventDispatcher } from 'svelte';
    //import { subscribe } from 'svelte/internal';

	let CLString: string = '';
	// export let String = '';
	export let qList = new RS1.qList('');
	
	let receivedPack: RS1.BufPack;
	
	console.log('CLString' + CLString);
	



	const dispatch = createEventDispatcher();
	const TypeArray = RS1.TypeNames;

	function close() {
		dispatch('close');
		dispatch('save', {value: receivedPack});
		//unsubscribe;
	}

	
	const LoL: RS1.LoL = new RS1.LoL();
	const rList: RS1.rList = new RS1.rList();
	

	onMount(async () => {
		const container: HTMLDivElement | null = document.getElementById(
			'cledit'
		) as HTMLDivElement | null;

		if (container) {
			
			const edit: QEditor = new QEditor(container, qList, rList);
			edit.Populate();
		}
	
	});

	
</script>


<div class="editor">
	<div id="cledit">
		<!-- {#if showEditorfields == true} -->
		<div class="selectContainer" />
		<!-- <button on:click={() => showEditorfields = false} >Edit </button> -->
		<!-- {/if} -->
		
		<!-- {#if showEditorfields == false} -->
		<div class="VIDOperations">
			
			<div class="functions" id="Line1">
				<label for="name">Name: </label>
				<input type="text" name="name" placeholder="No Use Unless You Add" />
				<!-- <label for="name">Name:</label>
			  <input type="text" id="name" bind:value={name} on:input={handleNameChange} readOnly={name !== ""}> -->
			  <!-- <label for="name">Name:</label>
		<input type="text" id="name" bind:value={name} on:input={handleNameChange} readOnly={nameSet}> -->
				<label for="desc">Desc: </label>
				<input type="text" name="desc" />
				<!-- <label for="value">Value:</label> -->
				<!-- <input type="text" name="value" /> -->
			</div>
			
			<div class="functions" id="Line2">
				<label for="format">ValueType: </label>
				<select name="format" placeholder="Format" id="format">
					<!-- <option value = "Null">Null</option>
					<option value="Dollar">Dollar</option>
					<option value="Int">Int</option>
					<option value="Num">Num</option>
					<option value="Nums">Nums</option>
					<option value="Ord">Ord</option>
					<option value="Pair">Pair</option>
					<option value="Range">Range</option>
					<option value="Str">Str</option>
					<option value="Upper">Upper</option>
					<option value="Member">Member</option>
					<option value="Set">Set</option> -->
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
			
			<!-- <div>
			  
			
			  <label for="type">Type:</label>
			  <input type="text" id="type" bind:value={type} on:input={handleTypeChange} readOnly={type !== ""}>
			
			  <label for="sub">Sub:</label>
			  <input type="text" id="sub" bind:value={sub} on:input={handleSubChange} readOnly={sub !== ""}>
			</div> -->
				<button id="save">Save</button>
				<button id="del">Delete</button>
				<button id="clear">Clear</button>
				<button id="copy">Copy</button>
				<button id="up">Up</button>
				<button id="down">Down</button>
				<button id="add">Add</button>
				<button on:click={close}>Back</button>
			</div>
		</div>
		<!-- {/if} -->
	</div>
</div>

<style lang="scss">
	.VIDOperations {
		width: 100%;
		display: flex;
		// align-items: center;
		justify-content: center;
		//gap: 10px;
		flex-direction: column;
		
	}

	.editor {
		width: 100%;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;
	}

	#cledit {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;
		width: 450px;
		height: 100%;
		padding: 10px;
	}

	.functions {
		align-items: center;
		justify-content: center;
		display: flex;
		flex-direction: row;
		gap: 5px;
		flex-direction: column;
	}

	// input,
	// select {
	// 	width: 200px;
	// 	height: 40px;
	// 	border-radius: 10px;
	// 	font-family: inherit;
	// 	outline: none;
	// 	border: none;
	// 	padding-left: 10px;
	// 	transition: 0.3s linear;
	// }

	// select[name='format'] {
	// 	width: 100px;
	// }

	// input[name='fmtstr'] {
	// 	width: 70px;
	// }

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

	.selectContainer {
	 width:   100%;
     height: auto;
     
     //border-radius:   8px;
     max-height: 500px; 
     overflow-y: auto;
     //gap:   10px;
	}

	input,
   select {
     width: 100%;
     height:   32px;
     border-radius:   8px;
     font-family: inherit;
     outline: none;
     border: none;
     padding-left:   5px;
     transition:   0.3s linear;
     width: 100%;
   }
	
	
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '$lib/ConstListEditor';
	import { RS1 } from '../../lib/RS';
	import { packStore } from '../../stores/packStore.js';
	import { createEventDispatcher } from 'svelte';
    //import { subscribe } from 'svelte/internal';

	let CLString: string = '';
	export let Pack: RS1.BufPack;
	let receivedPack: RS1.BufPack;
	//let SpecialData: RS1.RSData = new RS1.RSData();
	let SpecialData: RS1.vList = new RS1.vList();
	//CLString = Pack.str('data');
	//SpecialData.LoadPack(Pack);
	SpecialData.PostLoad(Pack)
	//CLString = SpecialData.Data.LStr;
	CLString = SpecialData.qstr;
	console.log('CLString' + CLString);
	//let showEditorfields = true;

	const unsubscribe = packStore.subscribe(value => {
      		receivedPack = value;
      		// console.dir('store pack' + receivedPack.str('data')); 
      
    });


	const dispatch = createEventDispatcher();
	const TypeArray = RS1.TypeNames;

	function close() {
		dispatch('close');
		dispatch('save', {value: receivedPack});
		//unsubscribe;
	}

	// const list1: RS1.vList = new RS1.vList(
	// 	'Test1|Test1Name:[%=Jane]Your Name|ListNum:[#=1]The List Number|'
	// );
	// const list2: RS1.vList = new RS1.vList(
	// 	'Test2|Test2Name:[%=John]Your Name|ListNum:[#=2]The List Number|'
	// );
	// const list3: RS1.vList = new RS1.vList(
	// 	'Test3|Test3Name:[%=Jacob]Your Name|ListNum:[#=3]The List Number|'
	// );
	const LoL: RS1.LoL = new RS1.LoL();
	// LoL.Add(list1.Str);
	// LoL.Add(list2.Str);
	// LoL.Add(list3.Str);

// 	function handleSavePack() {
// 	//  let newPack = new RS1.BufPack();
// 	//  let newPack: RS1.BufPack = new RS1.vList(CLString).SavePack
// 	let newPack: RS1.BufPack = new RS1.BufPack();
// 	 newPack.add(['type', 'List', 'data', CLString]);
//     packStore.set(newPack); // assuming packStore has an update method to send data to the store
// 	console.log(newPack)
//   }

	onMount(async () => {
		const container: HTMLDivElement | null = document.getElementById(
			'cledit'
		) as HTMLDivElement | null;

		if (container) {
			const list: RS1.vList = new RS1.vList(CLString);
			const edit: Editor = new Editor(container, list, LoL);
			edit.Populate();
		}
		// console.dir('prop pack' + Pack.str ('data'))
	// 	const unsubscribe = packStore.subscribe(value => {
    //   		receivedPack = value;
    //   		//console.dir('store pack' + receivedPack.str('data')); 
      
    // });

    	//return unsubscribe; 
	});

	// let name = "";
	// let type = "";
	// let sub = "";
  
	// function handleNameChange(event:any) {
	//   if (name === "") {
	// 	name = event.target.value;
	//   }
	// }
  
	// function handleTypeChange(event:any) {
	//   if (type === "") {
	// 	type = event.target.value;
	//   }
	// }
  
	// function handleSubChange(event:any) {
	//   if (sub === "") {
	// 	sub = event.target.value;
	//   }
	// }

	// let name = "";
	// let type = "";
	// let sub = "";

	// $: nameSet = name !== "";
	// $: typeSet = type !== "";
	// $: subSet = sub !== "";

	// function handleNameChange(event:any) {
	// 	name = event.target.value;
	// }

	// function handleTypeChange(event:any) {
	// 	type = event.target.value;
	// }

	// function handleSubChange(event:any) {
	// 	sub = event.target.value;
	// }
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

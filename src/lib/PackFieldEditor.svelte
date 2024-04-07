<script lang="ts">
import { RS1 } from '$lib/RS';
import { createEventDispatcher } from 'svelte';

export let D: RS1.BufPack;
let packArray = D.fetch('');
console.log(packArray)
let step = 'selectPack';
let selectedRow:RS1.PackField
let addingNewRecord = false; 
const TypeArray = [RS1.tNone,RS1.tStr,RS1.tNum,RS1.tPack,RS1.tAB,RS1.tList];

function setSelectedRow(row: RS1.PackField): RS1.PackField {
  selectedRow = row;
  return selectedRow;
}

function addNewRecord() {
  addingNewRecord = true;
  selectedRow = RS1.NILField;
  step = 'editPack';
}

const dispatch = createEventDispatcher();
function close() {
		dispatch('close');
	}
</script>


<main>
  {#if step === 'selectPack'}
  <div>
    <h1>Packs</h1>
    
    <div class="selectContainer">
      {#each packArray as row (row)}
        <div on:click={() => {setSelectedRow(row); step = 'editPack' ; addingNewRecord = false; console.log('selected row' + selectedRow.Name)}}>
          {row.desc}
        </div>
      {/each}
    </div>
    <button on:click={close}>Back</button>
    <button on:click={addNewRecord}>Add</button>
    </div>
    {:else if step === 'editPack'}
    <div>
    <div class="fields" id="Line1">
      <label for="name">Name: </label>
      <input type="text" id="name" name="name" bind:value={selectedRow.Name} placeholder="Name" readonly={addingNewRecord === false} />
      <label for="data">Data: </label>
      <input type="text" id="data" name="data" bind:value={selectedRow.Data} placeholder="Description" />
      <label for="type">Type: </label>
      <select id="type" name="type" bind:value={selectedRow.Type} placeholder="Type">
        {#each TypeArray as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    <div class="buttons">
      <button on:click={() => step = 'selectPack'}>Back</button>
    </div>
  </div>
  
  {/if}
</main>


<style lang="scss">
   .selectContainer {
     width:   100%;
     height: auto;
     padding:   10px;
     border-radius:   8px;
     box-shadow:   0   2px   4px rgba(0,   0,   0,   0.1);
     max-height: 500px; 
     overflow-y: auto;
     gap:   10px;
   }
   .selectContainer div {
     cursor: pointer;
     padding:   2px;
     margin-bottom:   4px;
     border-radius:   4px;
     transition: background-color   0.3s ease;
   }
   
   .selectContainer div:hover {
     background-color: #3297FD;
   }
   
   .fields {
    
    justify-content: center;
    display: flex;
    flex-direction: column; 
    gap:  10px; 
 //    padding:   5px;
    width:  100%; 
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

 
   select {
    display: inline-block;
    vertical-align: top; 
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

</style>
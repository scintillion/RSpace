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
  selectedRow = new RS1.PackField('','')
  step = 'editPack';
}

const dispatch = createEventDispatcher();
function close() {
		dispatch('close');
	}

  let selectedType: RS1.PackField["Type"] = RS1.tNone
  function handleTypeChange(event: any) {
    const selectedType =  event.target.value;
  }

  
</script>


<main>
  {#if step === 'selectPack'}
  <div>
    <h1>Packs</h1>
    
    <div class="selectContainer">
      {#each packArray as row (row)}
        <div on:click={() => {setSelectedRow(row); step = 'editPack' ; addingNewRecord = false; console.log('selected row' + selectedRow.Name); console.log('row type' + selectedRow.Type)}}>
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
      <!-- <input type="text" id="name" name="name" bind:value={selectedRow.Name} placeholder="Name" readonly={addingNewRecord === false && selectedRow.Name !== ''} /> -->
      <!-- <input type="text" id="name" name="name" bind:value={selectedRow.Name} placeholder="Name" /> -->
      <!-- <input type="text" id="name" name="name" on:input={e => selectedRow.setName(e.target?.value === '' ? null : e.target.value)} placeholder="Name" /> -->
      <input type="text" id="name" name="name" bind:value={selectedRow.Name} on:change={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.value !== '') {
          selectedRow.setName(target.value);
          console.log('row name' + selectedRow.Name);
          console.log('target val' + target.value);
        } 
        }}
        placeholder="Name"
        readonly={addingNewRecord === false && selectedRow.Name !== ''}
      />
      <label for="type">Type: </label>
      <select id="type" name="type"  placeholder="Type" on:change={handleTypeChange} bind:value={selectedType} >
        {#if addingNewRecord}
          {#each TypeArray as type}
            <option value={type}>{type}</option>
          {/each}
        {:else}
          <option value={selectedRow.Type} selected>{selectedRow.Type}</option>
        {/if}
      </select>
      <label for="data">Data: </label>
      <input type="text" id="data" name="data" bind:value={selectedRow.Data} 
      on:change={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.value !== '') {
  
          switch (selectedType) {
            case RS1.tStr:
              selectedRow.setData(String(target.value));
              break;
            case RS1.tNum:
              selectedRow.setData(Number(target.value));
              break;
            case RS1.tList:
              let vList = new RS1.vList(target.value);
              selectedRow.setData(vList);
              console.log('vlist' + vList.desc);
              break;
            case RS1.tPack:
              let Pack = new RS1.BufPack(target.value);
              selectedRow.setData(Pack);
            case RS1.tAB:
              let AB = selectedRow.toAB;
              selectedRow.setData(AB)
            default:
              selectedRow.setData(target.value);
              break;
          }
          //selectedRow.setData(target.value);
          console.log('row name' + selectedRow.Data);
          console.log('selected type' + selectedType);
          console.log('target val' + target.value);
        } 
        }}
        placeholder="Description"
      />
      
      <label for="AB">ArrayBuffer:</label>
      <input type="text" id="AB" name="AB" bind:value={selectedRow.AB} placeholder="ArrayBuffer" />
    </div>
    <div class="buttons">
      <button on:click={() => step = 'selectPack'}>Back</button>
      <button on:click={() => {D.addField(selectedRow); console.log('Saved D' + D.desc); step = 'selectPack'}}>Save</button>
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
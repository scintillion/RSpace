<script lang="ts">
import { RS1 } from '$lib/RS';
import { createEventDispatcher } from 'svelte';

export let D: RS1.BufPack;
console.log('Initial packfield D' + D.desc);
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
function handleSave() {
  D.addField(selectedRow);
  console.log('Saved D' + D.desc);
  dispatch('onPackChange', {value: D});
  step = 'selectPack'
  
}

function handleDelete() {
  D.delField(selectedRow);
  packArray = D.fetch('');
  step = 'selectPack';
}
  let selectedType: RS1.PackField["Type"] 
  function handleTypeChange(event: any) {
    const selectedType =  event.target.value;
  }
  
function handleClear() {
  selectedRow.clear();
  selectedRow = selectedRow;
}  

function handleDownload() {
  let AB = selectedRow.toAB1;
  RS1.DownloadAB(selectedRow.Name,AB);
}

async function handleUpload(event: Event & { currentTarget: HTMLInputElement }) {
  const files = (event.currentTarget as HTMLInputElement).files;
  if ( files !== null && files.length > 0) {
    try {
      const file = files[0];
      const arrayBuffer = await RS1.UploadAB(file);
      addNewRecord();

      let Decoder = new TextDecoder('utf-8');
      let ABText = Decoder.decode(arrayBuffer);

      console.log("AB data" + ABText);
      selectedRow.setData(ABText);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  
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
              let AB = selectedRow.toAB1;
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
      <!-- <button on:click={() => {D.addField(selectedRow); console.log('Saved D' + D.desc); step = 'selectPack'}}>Save</button> -->
      <button on:click={handleSave}>Save</button>
      <button on:click={handleClear}>Clear</button>
      <button on:click={handleDelete}>Delete</button>
      <button on:click={handleDownload}>Download</button>
      <button>
        <label for="file-upload">Upload</label>
        <input id="file-upload" type="file" on:change={handleUpload} style="display: none;" />
      </button>
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
   .buttons {
     display: flex;
     flex-wrap: wrap;
     justify-content: center;
     gap: 10px;
   }
</style>
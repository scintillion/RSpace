<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RS';
  import { InitClient } from '$lib/API/client/request';

  InitClient();

  let tableNames: string[] = [];
  let summaryResult: any[] = []; // Results from ReqNames
  let detailedResult: RS1.RSData = new RS1.RSData(); // Single record from ReqData
  let newRecord: RS1.RSData = new RS1.RSData(); // New record data
  let selectedTableName = 'S';
  let editingRecordId: string | null = null;
  let selectedItemId: string | null = null;
  let addingNewRecord = false; 

  const selectTable = async (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    selectedTableName = selectElement.value;
    summaryResult = await RS1.ReqNames(selectedTableName);
  };

  const startEditing = async (id: string) => {
    editingRecordId = id;
    detailedResult = await RS1.ReqData(selectedTableName, id);
    selectedItemId = id;
  };

  const addNewRecord = async () => {
    editingRecordId = null;
    selectedItemId = null;
    newRecord = new RS1.RSData();
    addingNewRecord = true; 
    summaryResult = await RS1.ReqNames(selectedTableName);

  };

  const saveChanges = async () => {
    const writeResult = await currentRecord.toDB();
    console.log(`Write result: ${writeResult}`);
    editingRecordId = null;
    selectedItemId = null;
    newRecord = new RS1.RSData();
    summaryResult = await RS1.ReqNames(selectedTableName);
    addingNewRecord = false; 
  };

  onMount(async () => {
    try {
      // get table names
      tableNames = await RS1.ReqTiles();
      console.log(tableNames);

      // fetch summary data
      summaryResult = await RS1.ReqNames(selectedTableName);
    } catch (error) {
      console.error('Error fetching table names:', error);
    }
  });

  // handle conditional binding
  $: currentRecord = editingRecordId ? detailedResult : newRecord;
</script>

<main>
  <h1>Tables</h1>

  <select value={selectedTableName} on:change={selectTable}>
    {#each tableNames as tableName (tableName)}
    <option value={tableName}>{tableName}</option>
    {/each}
  </select>

  <div class="dbeditor">
    
    <div class="selectContainer">
      {#each summaryResult as row (row)}
        <div on:click={() => startEditing(row.ID)} class:selected={row.ID === selectedItemId}>
          <span id="id">ID: {row.ID}</span> Name: {row.Name} Description: {row.Desc}
        </div>
      {/each}
     
      {#if addingNewRecord}
        <div class:selected={true}>
          <span id="id">+</span> New Record. Press Save to submit.
        </div>
      {/if}
    </div>
      
    <div class="fields" id="Line1">
      <label for="name">Name: </label>
      <input type="text" id="name" name="name" bind:value={currentRecord.Name} placeholder="Name" />
      <label for="desc">Desc: </label>
      <input type="text" id="desc" name="desc" bind:value={currentRecord.Desc} placeholder="Description" />
      <label for="type">Type: </label>
      <input type="text" id="type" name="type" bind:value={currentRecord.Type} placeholder="Type" />
      <label for="tile">Tile: </label>
      <input type="text" id="tile" name="tile" bind:value={currentRecord.Tile} placeholder="Tile" />
      <label for="sub">Sub: </label>
      <input type="text" id="sub" name="sub" bind:value={currentRecord.Sub} placeholder="Sub" />
      <label for="details">Details: </label>
      <input type="text" id="details" name="details" bind:value={currentRecord.Details} placeholder="Details" />
      <label for="data">Data: </label>
      <input type="text" id="data" name="data" bind:value={currentRecord.Data} placeholder="Data" />
    </div>
    
    <div class="buttons">
      <button id="save" on:click={saveChanges}>Save</button>
      <button id="add" on:click={addNewRecord}>Add</button>
    </div>
    
  </div>
</main>




<style lang="scss">
  .dbeditor {
   width:   100%;
   height: auto;
   display: flex;
   align-items: center;
   justify-content: center;
   flex-direction: column;
   gap:   10px;
   padding:   10px;
   border-radius:   10px;
   box-shadow:   0   4px   6px rgba(0,   0,   0,   0.1);
   font-size:   0.8rem;
 }
 
 .fields {
   align-items: center;
   justify-content: center;
   display: flex;
   flex-direction: row;
   gap:   5px;
   padding:   5px;
 }
 
 input,
 select {
   width:   160px;
   height:   32px;
   border-radius:   8px;
   font-family: inherit;
   outline: none;
   border: none;
   padding-left:   5px;
   transition:   0.3s linear;
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
 
 #add {
   margin-left:   10px; 
   background-color: green; 
 }
 
 .selectContainer {
   width:   100%;
   height: auto;
   padding:   10px;
   border-radius:   8px;
   box-shadow:   0   2px   4px rgba(0,   0,   0,   0.1);
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
 
 .selectContainer div.selected {
   background-color: #3297FD;
 }
 
 #id {
   display: inline-block;
   background-color: black;
   color: white;
   padding:   2px   4px;
   border-radius:   4px;
   margin-right:   5px;
   vertical-align: middle;
 }
 </style>
 
<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RS';
  import { InitClient } from '$lib/API/client/request';

  
  let step = 'selectTableAndType'; // Default step (view)
  let tableNames: string[] = [];
  let selectedTableName = '';
  let typeFilter: string = '';
  let subFilter: string = '';
  let summaryResult: any[] = []; // Results from ReqNames
  let detailedResult: RS1.RSData = new RS1.RSData();
  let editingRecordId: string | null = null;
  let selectedItemId: string | null = null;
  let addingNewRecord = false; 
  let selectedrecordId: number | null;
  let newRecord: RS1.RSData = new RS1.RSData(); 

  InitClient();
  
  const selectTableAndType = async () => {
      summaryResult = await RS1.ReqRecs(selectedTableName, typeFilter, subFilter); // fetch description based on selected table and filters
      step = 'recordList'; // move to record list step
  };

  // handle the selection of a record for editing
  const startEditing = async (id: string) => {
      editingRecordId = id;
      detailedResult = await RS1.ReqData(selectedTableName, id);
      step = 'editRecord'; 
      selectedItemId = id;
      addingNewRecord = false; 
  };

  
  const addNewRecord = async () => {
      editingRecordId = null;
      selectedItemId = null;
      newRecord = new RS1.RSData();
      addingNewRecord = true; 
      summaryResult = await RS1.ReqNames(selectedTableName);
      step = 'editRecord';
  };

  
  const saveChanges = async () => {
      const writeResult = await currentRecord.toDB();
      console.log(`Write result: ${writeResult}`);
      editingRecordId = null;
      selectedItemId = null;
      newRecord = new RS1.RSData();
      summaryResult = await RS1.ReqNames(selectedTableName);
      addingNewRecord = false; 
      step = 'recordList';
  };

  const deleteRecord = async (id: string) => {
      selectedrecordId = Number(id);
      let Pack = RS1.sql.bSelDel(selectedTableName, selectedrecordId, 'D');
      let Reply = await RS1.ReqPack(Pack);
      console.log('DelReply:\n' + Reply.desc);
      summaryResult = await RS1.ReqNames(selectedTableName);
      step = 'recordList';
};

  // special data edit function
  const handleSpecialDataEdit = async () => {
      let Pack = new RS1.BufPack();
      Pack.add(['A', 'Edit', 'type', currentRecord.Type, 'data', currentRecord.Data]);
      console.log(Pack)
      return Pack;
      
  }

  // handle conditional binding
  $: currentRecord = editingRecordId ? detailedResult : newRecord;
  
  // Fetch table names on mount
  onMount(async () => {
    tableNames = await RS1.ReqTiles();
  });
</script>

<main>
{#if step === 'selectTableAndType'}
  <div>
    <div class="selectDropdown">
      <h1>Database Editor</h1>
      <h3>Table</h3>
      <select bind:value={selectedTableName}>
        {#each tableNames as tableName (tableName)}
          <option value={tableName}>{tableName}</option>
        {/each}
      </select>

      <h3>Type</h3>
      <select bind:value={typeFilter}>
        <option value="">All</option>
        <option value="List">List</option>
      </select>

      <h3>Subtype</h3>
      <input type="text" id="sub" name="Sub" bind:value={subFilter} placeholder="Sub" />
      <!-- <select bind:value={subFilter}>
        <option value="">All</option>
      </select> -->
      <button on:click={selectTableAndType}>Submit</button>
    </div>
    
  </div>
{:else if step === 'recordList'}
  <div>
    <h1>Record</h1>
    <div class="selectContainer">
      {#each summaryResult as row (row)}
        <div on:click={() => startEditing(row.ID)} class:selected={row.ID === editingRecordId}>
          <span id="id">ID: {row.ID}</span> Name: {row.Name} Description: {row.Desc}
        </div>
      {/each}
    </div>
    <div class="buttons">
    <button on:click={() => step = 'selectTableAndType'}>Back</button>
    <button on:click={addNewRecord}>Add</button>
  </div>
  </div>
{:else if step === 'editRecord'}
  <div>
    <h1>Edit Record</h1>
    <div class="fields" id="Line1">
      <label for="name">Name: </label>
      <input type="text" id="name" name="name" bind:value={currentRecord.Name} placeholder="Name" />
      <label for="desc">Desc: </label>
      <input type="text" id="desc" name="desc" bind:value={currentRecord.Desc} placeholder="Description" />
      <label for="type">Type: </label>
      <select bind:value={subFilter}>
          <option value=""></option>
          <option value="List">List</option>
      </select>
      <label for="tile">Tile: </label>
      <input type="text" id="tile" name="tile" bind:value={selectedTableName} placeholder="Tile" readonly />
      <label for="sub">Sub: </label>
      <input type="text" id="sub" name="sub" bind:value={currentRecord.Sub} placeholder="Sub" />
      <label for="details">Details: </label>
      <input type="text" id="details" name="details" bind:value={currentRecord.Details} placeholder="Details" />
      <label for="data">Data: </label>
     
      <input type="text" id="data" name="data" bind:value={currentRecord.Data} placeholder="Data" readonly />
     
      
      <div class="buttons">
          <button on:click={() => step = 'recordList'}>Back</button>
          <button on:click={saveChanges}>Save</button>
          {#if addingNewRecord === false}
          <button on:click={() => selectedItemId && deleteRecord(selectedItemId)}>Delete</button>
          {/if}
          <button on:click={handleSpecialDataEdit}>Edit Data</button>
      </div>
    </div>
    
    
  </div>
{/if}

</main>


<style lang="scss">

   
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

  
   h3, select {
     display: inline-block;
     vertical-align: top; 
    }
  
   .selectDropdown {
     white-space: nowrap;
     margin-top: 10px;
     flex-direction: column;
     display: flex;
     align-items: center;
     justify-content: center;
     gap: 10px;
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
      justify-content: center;
     display: flex;
     flex-direction: row;
     gap: 10px;
   }
   
   
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
   
   @media (max-width:   768px) {
    .fields {
      flex-direction: column; 
      gap:  10px; 
    }
  
   }
  
   
   </style>
   
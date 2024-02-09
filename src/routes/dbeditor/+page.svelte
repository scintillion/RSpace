<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RS';
  import { InitClient } from '$lib/API/client/request';

  InitClient();

  let tableNames: string[] = [];
  let summaryResult: any[] = []; // Results from ReqNames
  let detailedResult: any = {}; // Single record from ReqData
  let selectedTableName = 'S';
  let expandedRecordId: string | null = null; 
  let editingRecordId: string | null = null; 

  const selectTable = async (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    selectedTableName = selectElement.value;
    summaryResult = await RS1.ReqNames(selectedTableName);
  };

  const expandRecord = async (id: string) => {
    expandedRecordId = id;
    detailedResult = await RS1.ReqData(selectedTableName, id);
  };

  const collapseRecord = () => {
    expandedRecordId = null;
    detailedResult = {}; 
  };

  const startEditing = (id: string) => {
    editingRecordId = id;
  };

  const saveChanges = async (id: string) => {
    const writeResult = await detailedResult.toDB();
    console.log(`Write result: ${writeResult}`);
    editingRecordId = null;
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
</script>

<main>
  <h1>Tables</h1>

  <select value={selectedTableName} on:change={selectTable}>
    {#each tableNames as tableName (tableName)}
      <option value={tableName}>{tableName}</option>
    {/each}
  </select>

  {#if summaryResult.length >  0}
    <ul>
      {#each summaryResult as row (row)}
        <li>
          ID: {row.ID}, Name: {row.Name}, Description: {row.Desc}
          <button on:click={() => expandRecord(row.ID)}>Expand</button>
          {#if expandedRecordId === row.ID && Object.keys(detailedResult).length >  0}
            <div>
              {#if editingRecordId === row.ID}
                <form on:submit|preventDefault={() => saveChanges(row.ID)}>
                  <input type="text" bind:value={detailedResult.Name} placeholder="Name" />
                  <input type="text" bind:value={detailedResult.Desc} placeholder="Description" />
                  <input type="text" bind:value={detailedResult.Type} placeholder="Type" />
                  <input type="text" bind:value={detailedResult.Tile} placeholder="Tile" />
                  <input type="text" bind:value={detailedResult.Str} placeholder="String" />
                  <input type="text" bind:value={detailedResult.Sub} placeholder="Sub" />
                  <input type="text" bind:value={detailedResult.Details} placeholder="Details" />
                  <input type="text" bind:value={detailedResult.Data} placeholder="Data" />
                  <button type="submit">Save</button>
                </form>
              {:else}
              ID: {detailedResult.ID}, Name: {detailedResult.Name}, Description: {detailedResult.Desc}, Type: {detailedResult.Type}, Tile: {detailedResult.Tile}, Sub: {detailedResult.Sub}, Details: {detailedResult.Details}, Data: {detailedResult.Data}
                <button on:click={() => startEditing(row.ID)}>Edit</button>
              {/if}
            </div>
            <button on:click={collapseRecord}>Collapse</button>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p>No data available for '{selectedTableName}'.</p>
  {/if}
</main>

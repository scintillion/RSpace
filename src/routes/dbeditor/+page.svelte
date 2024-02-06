<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RS';
   
  let tableNames: string[] = [];
  let result: any[] = [];
  let selectedTableName: string;
  let editingIndex: number | null = null;
   
  const selectTable = async (event: Event) => {
     const selectElement = event.target as HTMLSelectElement;
     selectedTableName = selectElement.value;
     result = await RS1.ReqNames(selectedTableName);
  };
   
  const startEditing = (index: number) => {
     editingIndex = index;
  };
   
  const saveChanges = async (index: number) => {
     // send the updated row to the server 
     const writeResult = await result[index].toDB();
     console.log(`Write result: ${writeResult} Name: ${result[index].Name} Str: ${result[index].Str}`);
     editingIndex = null;
  };
   
  onMount(async () => {
     try {
       // get table names
       tableNames = await RS1.ReqTiles();
       console.log(tableNames);
       
       selectedTableName = tableNames[0];
       
       // fetch data for the  table
       result = await RS1.ReqNames(selectedTableName);
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
  
  {#if result.length > 0}
      <ul>
        {#each result as row, index (row)}
          <li>
            {#if editingIndex === index}
              <form on:submit|preventDefault={() => saveChanges(index)}>
                <input type="text" bind:value={row.Name} placeholder="Name" />
                <input type="text" bind:value={row.Desc} placeholder="Description" />
                <input type="text" bind:value={row.Type} placeholder="Type" />
                <input type="text" bind:value={row.Tile} placeholder="Tile" />
                <input type="text" bind:value={row.Sub} placeholder="Sub" />
                <button type="submit">Save</button>
              </form>
            {:else}
              Name: {row.Name}, Description: {row.Desc}, Type: {row.Type}, Tile: {row.Tile}, Sub: {row.Sub}
              <button on:click={() => startEditing(index)}>Edit</button>
            {/if}
          </li>
        {/each}
      </ul>
  {:else}
      <p>No data available for '{selectedTableName}'.</p>
  {/if}
 </main>
 

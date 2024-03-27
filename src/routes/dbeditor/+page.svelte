<script lang="ts">
  import { onMount } from 'svelte';
  import { RS1 } from '$lib/RS';
  import { InitClient } from '$lib/API/client/request';
  import Editor from '../../components/tiles/Editor.svelte';
  import { packStore } from '../../stores/packStore.js';
  import { subscribe } from 'svelte/internal';
  
  let step = 'selectTableAndType'; // Default step (view)
  let tableNames: string[] = [];
  let selectedTableName = 'S';
  let typeFilter: string = '';
  let subFilter: string = '';
  let summaryResult: any[] = []; // Results from ReqNames
  let detailedResult: RS1.RSData = new RS1.RSData();
  let editingRecordId: string | null = null;
  let selectedItemId: string | null = null;
  let addingNewRecord = false; 
  let selectedrecordId: number | null;
  let newRecord: RS1.RSData = new RS1.RSData(); 
  let Pack: RS1.BufPack = new RS1.BufPack();
  let receivedPack: RS1.BufPack = new RS1.BufPack();
  let showEditor = false;


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
  const handleSpecialDataEdit = () => {
      showEditor = true;
      Pack.add(['A', 'Edit', 'type', currentRecord.Type, 'data', currentRecord.Data]);
      packStore.set(Pack);
      console.log(Pack)
      return Pack;
      
      
  }

  const closeSpecialDataEditor = () => {
    showEditor = false;
  }
  


  async function EditList(D: RS1.vList, EditContainer: HTMLElement | null, isListField: Boolean = false): Promise<{D:RS1.vList,isListField: Boolean}> {
    let list: RS1.vList = new RS1.vList();
    console.log ('EditList:' + D.desc);
    let P = D.SavePack ();
    console.log ('  EditList Pack:\n',P.desc);
    console.log('D List val' + D.List)
    
    Pack = D.SavePack();

    if (EditContainer) {
        const editorComponent = new Editor({
            target: EditContainer,
            props: {
                Pack,
            },
        });
    } else {
        const modalBackground = document.createElement('div');
        modalBackground.style.position = 'fixed';
        modalBackground.style.top = '0';
        modalBackground.style.left = '0';
        modalBackground.style.width = '100%';
        modalBackground.style.height = '100%';
        modalBackground.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalBackground.style.zIndex = '1';
        document.body.appendChild(modalBackground);

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

        const style = document.createElement('style');
        style.innerHTML = `
        @keyframes animatetop {
          from {top: 100px; opacity: 0}
          to {top: 40%; opacity: 1}
        }
        `;
        document.head.appendChild(style);

        modalContent.style.animationName = 'animatetop';
        modalContent.style.animationDuration = '0.4s';

        const editorComponent = new Editor({
            target: modalContent,
            props: {
                Pack,
            },
        });

        modalContent.style.display = 'block';

        editorComponent.$on('close', () => {
        modalContent.remove();
        modalBackground.remove();
        unsubscribe();
    });

    }
    
    const unsubscribe = packStore.subscribe(value => {
        receivedPack = value;
    
        if (receivedPack.str('data')) {
          D = new RS1.vList(receivedPack.str('data'));
          console.log('BUFPACK DATA' + receivedPack.str('data'))    
      
          packStore.set(new RS1.BufPack());
        }

    });

    
    unsubscribe();
    console.log('D RETURN' + D.getStr);

    return {D:D, isListField:isListField};
}

  // handle conditional binding
  $: currentRecord = editingRecordId ? detailedResult : newRecord;
  
  // Fetch table names on mount
  onMount(async () => {
    tableNames = await RS1.ReqTiles();
  });

 
</script>

<!-- {#if showEditor} 
  <Editor {Pack} on:close={closeSpecialDataEditor} />
{/if} -->

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
     <input type="text" id="name" name="name" bind:value={currentRecord.Name} placeholder="Name" readonly={addingNewRecord=== false} />
      <label for="desc">Desc: </label>
      <input type="text" id="desc" name="desc" bind:value={currentRecord.Desc} placeholder="Description" />
      <label for="type">Type: </label>
      <select bind:value={subFilter} disabled={addingNewRecord=== false}>
          <option value=""></option>
          <option value="List">List</option>
      </select>
      <label for="tile">Tile: </label>
      <input type="text" id="tile" name="tile" bind:value={selectedTableName} placeholder="Tile" readonly />
      <label for="sub">Sub: </label>
      <input type="text" id="sub" name="sub" bind:value={currentRecord.Sub} placeholder="Sub" readonly={addingNewRecord=== false} />
      <label for="details">Details: </label>
      <input type="text" id="details" name="details" bind:value={currentRecord.Details} placeholder="Details" />
      <div class="editButtons">
        <button id="list" on:click={async () => {
          const { D, isListField } = await EditList(currentRecord.List, null, true);
          if (isListField) {
              currentRecord.List = D;
          }
      }}>List {currentRecord.List.desc}</button>
      <button id="pack">Pack {currentRecord.Pack.desc}</button>
      <button id="data" on:click={async () => {
        const { D, isListField } = await EditList(currentRecord.Data.type==='List' ? currentRecord.Data: new RS1.vList(currentRecord.Data), null, false);
        if (!isListField) {
            currentRecord.Data = D.LStr;
            //D.toDB();
            console.log('S$$$DATA$$$' + currentRecord.Data);
        }
    }}>Data: Type Specific</button>
      </div>
      <div id="specialdatadiv"></div>
     
      <div class="buttonsContainer">
        <div class="buttons">
          <button on:click={() => step = 'recordList'}>Back</button>
          <button on:click={saveChanges}>Save</button>
          {#if addingNewRecord === false}
            <button on:click={() => selectedItemId && deleteRecord(selectedItemId)}>Delete</button>
          {/if}
        </div>
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

   .editButtons {
     justify-content: center;
     display: flex;
     flex-direction: column;
     gap: 10px;
   }
   .editButtons button {
    width: 100%;
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

   .buttonsContainer {
    display: flex;
    flex-direction: column;
    gap: 0px;
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
   
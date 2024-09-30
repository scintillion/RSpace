<script lang="ts">
	import { mount, unmount } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RSsvelte.svelte';
	import { RTile } from '../../components/tiles/RTile'
	import Editor from '../../components/tiles/Editor.svelte';
	import QEditor from '../../components/tiles/QEditor.svelte';
   
	// const TileStrings: string[] = [
	// 	'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
	// 	' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
	// 	' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
	// 	'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
	// 	'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
	// 	'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
	// 	'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	// ];

	const TileStrings: string[] = [
		'TS4:TileStrings Desc4',
		'T\ta|name:Full|\ts|display:flex|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|background-image:url("")|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:none|justify-content:space-evenly|background-image:url("")|\t',
		'  T\ta|name:Left|inner:<h1>I am the left side</h1> <h2><i>Click button for alert!</i></h2>|\ts|background:orange|width:20vw|height:90vh|display:flex|gap:5px|background-image:url("")|\t',
		'   RndBtn\ta|name:Button|inner:Alert|alert:hello|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:<h1>I am the middle</h1> <h2>click to upload image</h2>|\ts|background:cyan|display:flex|width:60vw|height:90vh|background-image:url("")|\t',
		'   ImgBtn\ta|name:Button|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|border-radius:8px|\t',
		'  T\ta|name:Right|inner:<h2>Enter text</h2> <i>use html tags for formatting</i>|text:true|\ts|background:green|display:flex|width:20vw|height:90vh|background-image:url("")|\t',
		'   TxtBtn\ta|name:Button|inner:save|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|border-radius:8px|\t',
	]; 

	// const TileStrings: string[] = ['T\ta||\ts||\t'];

// 	const TileStrings: string[] = [
//   		'T\ta|name:Full|inner:Use arrow keys to move tile|\ts|display:block|height:100vh|width:100vw|font-size:40px|\t',
//  		' T\ta|name:Top|\ts|background:white|height:70px|width:70px|position:relative|top:50%|left:50%|\t',
// ];

	const List: RS1.TileList = new RS1.TileList(TileStrings); // remove temporarily

	// onMount(() => {
	// 	let tiles = document.querySelector('.tilesabc');
	// });
	const TileArray:any = []
	let selectedTile: RS1.TDE = new RS1.TDE('')
	let VIDArray: RS1.vID[] | undefined = []
	let VIDStyle: RS1.vID[] | undefined = []
	let VIDAttribute: RS1.vID[] | undefined = []
	let VIDsArray = []
	const Str: string = '>'
	let step = 'selectTile'
	let ListType = 'attributes'
	let currentEditor: any = null;
	let showPlot = false

    let Tiles = List.tiles;
	console.log ('List of Tiles in TileWorks:');
	for (const T of Tiles) {
		if (T)
			console.log (T.info);
	}

	List.tiles.forEach(tile => {
		TileArray.push(tile)
		})

	function selectTile(tile: RS1.TDE) {
		selectedTile = tile
		step = 'editTile'
		VIDArray = tile.aList?.toSortedVIDs;
		VIDStyle = tile.sList?.toSortedVIDs;
		VIDAttribute = tile.aList?.toSortedVIDs;
		VIDArray?.forEach(VID => {
			VIDsArray.push(VID)
		})
		Edit(tile)
		
	}

async function handleUpload(event: Event, tile: RS1.TDE) {
  const files = (event.currentTarget as HTMLInputElement).files;
  const VID = tile.sList?.getVID('background-image');
  if ( files !== null && files.length > 0) {
    try {
      const file = files[0];
	  const reader = new FileReader();
	  reader.readAsDataURL(file);
	  reader.onload = (e) => {
		if (VID) {
			VID.Desc = `url("${e.target?.result}")`;
			tile.sList?.setVID(VID);
	  }
	}
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }
step = 'selectTile'
  
}


	function Edit(tile: RS1.TDE) {
		let sList = tile.sList;
		let aList = tile.aList;
		// let sPack = sList?.SavePack();
		// let aPack = aList?.SavePack();
		const EditContainer = document.querySelector('.editContainer');
			
			if (currentEditor) {
				unmount(currentEditor);
				// currentEditor.$destroy();
				currentEditor = null;
			}
			
			if (EditContainer) {
				const modalContent = document.createElement('div');
				document.body.appendChild(modalContent);
				if (ListType === 'styles') {
					  currentEditor = mount(QEditor,{
						target: EditContainer,
						props: {
							qList: sList,
							modalContent: modalContent ,
							modalBackground: modalContent
						},
						events: {
							close: () => {
								EditContainer.remove();
								step = 'selectTile';
							}
						}
					});
					// currentEditor.$on('close', () => {
					// 	EditContainer.remove();
					// 	step = 'selectTile';
					// });
					// currentEditor.$on('save', (event) => {
					// 	let ReceivedPack = event.detail.value;
					// 	if(ReceivedPack.str('data')) {
					// 		tile.sList = new RS1.qList(ReceivedPack.str('data'));
					// 	}
		
					// })
				} else if (ListType === 'attributes') {
					currentEditor = mount( QEditor,{
						target: EditContainer,
						props: {
							qList: aList,
							modalContent: modalContent,
							modalBackground: modalContent
						},
						events: {
							close: () => {
								EditContainer.remove();
								step = 'selectTile';
							}
						}
					});
					// currentEditor.$on('close', () => {
					// 	EditContainer.remove();
					// 	step = 'selectTile';
					// });
					// currentEditor.$on('save', (event) => {
					// 	let ReceivedPack = event.detail.value;
					// 	if(ReceivedPack.str('data')) {
					// 		tile.aList = new RS1.qList(ReceivedPack.str('data'));
					// 	}
						
		
					// })
				}
			}
		}
		// $: if (step === 'editTile') {
		//     Edit(selectedTile);
		// }


</script>


<!-- <div class="tiles"></div> -->
<!-- <r-tile TList = {List}>	</r-tile> -->
<!-- </div> -->
{#if !showPlot}
<div>
	<div id="edit">
	  {#if step == 'selectTile'}	
	  <div class='selectContainer'>
	    {#each TileArray as tile}
		<div on:click={() => selectTile(tile)} class:selected={tile === selectedTile} >
	        <span>{Str.repeat(tile.level)}{tile.aList?.descByName('name')} [{tile.TList?.listName.replace(/^\s+/, '')}]</span>
		  </div>
	    {/each}
	  </div>
	  <!-- <button>Add Tile</button> -->
	  <button on:click={() => showPlot = !showPlot}>Plot</button>
	  {/if}
	  {#if step === 'editTile'}
	  <div class="options">
		<button on:click={() => {ListType = 'attributes'; Edit(selectedTile)}}>Attributes</button>
		<button on:click={() => {ListType = 'styles'; Edit(selectedTile)}}>Styles</button>
		<button>
			<label for="file-upload">Add Image</label>
			<input id="file-upload" type="file" on:change={(event) => handleUpload(event,selectedTile)} style="display: none;" />
		  </button>
		
		<div class='editContainer' />
		
		<!-- <button on:click={() => step = 'selectTile'}>Back</button>
		<button>Add Tile</button>  -->
	  </div>
	  {/if}
	
	</div>
</div>
{/if}

{#if showPlot}
	<button on:click={() => showPlot = !showPlot}>Editor</button>
	<r-tile TList={List}></r-tile>

{/if}


<style>
	 .selectContainer {
     width:   100%;
     height: auto;
     padding:   10px;
     border-radius:   8px;
     box-shadow:   0   2px   4px rgba(0,   0,   0,   0.1);
     max-height: 500px; 
     overflow-y: auto;
     gap:   10px;
	 background-color: rgba(249, 240, 246);
   }

   .selectContainer div {
     cursor: pointer;
     padding:   2px;
     margin-bottom:   4px;
     border-radius:   4px;
     transition: background-color   0.3s ease;
	 color: black;
   }
   
   .selectContainer div:hover {
     background-color: lightblue;
   }
   
   .selectContainer div.selected {
     background-color: #3297FD;
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
   #edit {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;
		width: 450px;
		height: 100%;
		padding: 10px;
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

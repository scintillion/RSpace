<script lang="ts">
	import { mount, unmount } from 'svelte';
	import { Plotter } from '$lib/Plotter';
	import { RS1 } from '$lib/RSsvelte.svelte';
	import { TileListRenderer } from '../../components/tiles/RTile'
	import { VillaPlotter } from '../../components/tiles/VillaPlotter'
	import Editor from '../../components/tiles/Editor.svelte';
	import QEditor from '../../components/tiles/QEditor.svelte';
	import { onMount } from 'svelte';
   

	let TileStrings1: string[] = [
		'TS4:TileStrings Desc4',
		'T\ta|name:Full|drag:true|\ts|display:flex|position:relative|width:200vw|height:100vh|\t',
		' T\ta|name:Base|\ts|width:200vw|height:10vh|display:flex|flex-direction:row|\t',
		'  T\ta|name:Top|drag:true|clickAction:VillaLink|link:Tile2|inner:link to villa2|\ts|background:blue|display:flex|height:10vh|width:10vw|background-image:url("")|transform:translate(0px, 0px)|\t',
		'  T\ta|name:Top|drag:true|\ts|display:flex|align-items:left|padding-left:20px|background:magenta|height:10vh|width:190vw|background-image:url("")|transform:translate(0px, 0px)|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:none|justify-content:space-evenly|background-image:url("")|\t',
		'  T\ta|name:Base|\ts|width:20vw|height:90vh|\t',
		'   T\ta|name:Left|drag:true|hold:true|textPreview:true|innerEdit:true|inner:<h2>inner text</h2>|\ts|background:orange|width:20vw|height:90vh|display:flex|background-image:url("")|transform:translate(0px, 0px)|\t',
		'    RndBtn\ta|name:Button|inner:Alert|clickAction:Alert|alertContent:hello|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Base|\ts|width:60vw|height:90vh|\t',
		'   T\ta|name:Middle|drag:true|innerEdit:true|textPreview:true|BgImage:true|\ts|background:cyan|display:flex|width:60vw|height:90vh|background-image:url("")|overflow:hidden|postion:relative|transform:translate(0px, 0px)|\t',
		'  T\ta|name:Base|\ts|width:20vw|height:90vh|\t',
		'   T\ta|name:Right|drag:true|hold:true|\ts|background:green|display:flex|width:20vw|height:45vh|background-image:url("")|transform:translate(0px, 0px)|\t',
		'    Txt\ta|name:SenderTile|drag:true|hold:true|targetTile:ReceiverTile|nugDataType:greetingCommand|nugPayloadQL:messageContent:Hello ReceiverDirect from SenderTile!|extraInfo:This is a direct send.|timestamp:' + Date.now() + '|\ts|background:inherit|\t',
		'     T\ta|name:Base|\ts|display:flex|flex-direction:row|background:transparent|gap:5px|padding:5px|\t',
		'      Btn\ta|name:TextBold|inner:B|clickAction:Bold|\ts|display:flex|width:30px|height:30px|background:#D1D5DB|color:black|font-weight:bold|border-radius:8px|\t',
		'      Btn\ta|name:TextBold|inner:I|clickAction:Italic|\ts|display:flex|width:30px|height:30px|background:#D1D5DB|color:black|font-style:italic|border-radius:8px|\t',
		'      Btn\ta|name:TextBold|inner:U|clickAction:Underline|\ts|display:flex|width:30px|height:30px|background:#D1D5DB|color:black|text-decoration:underline|border-radius:8px|\t',
		'      ColorPicker\ta|name:ColorPicker|\ts|background:transparent|\t',
		'   T\ta|name:ReceiverTile|drag:true|hold:true|\ts|background:red|display:flex|width:20vw|height:45vh|background-image:url("")|transform:translate(0px, 0px)|\t',
		'  T\ta|name:Base|\ts|height:90vh|width:50vw|\t',
		'   Carousel\ta|name:Carousel|pan:true|drag:true|\ts|background:beige|background-image:url("")|height:90vh|width:50vw|transform:translate(0px, 0px)|\t',
		'  T\ta|name:Base|\ts|height:90vh|width:50vw|\t',
		'   Video\ta|name:VideoPlayer|video-src:|video-type:video/mp4|video-controls:true|video-autoplay:true|video-loop:true|video-muted:true|drag:true|\ts|background:blue|height:90vh|width:50vw|transform:translate(0px, 0px)|\t'
		
	];

	let TileStrings2: string[] = [
		'TS4:TileStrings Desc4',
		'T\ta|name:new|\ts|display:flex|height:100vh|width:100vw|\t',
		' T\ta|name:new tile|drag:true|\ts|display:flex|height:100vh|width:100vw|background:blue|display:flex|flex-direction:row|align-items:top|justify-content:left|\t',
		'  T\ta|name:tile|drag:true|clickAction:VillaLink|link:Tile1|inner:link to villa1|\ts|display:flex|height:10vh|width:10vw|background:orange|\t',
	]


	let VillaTiles: string[] = $state([
		'MagicTile1,10,10,20,20',
        'MagicTile2,40,10,20,20',
        'MagicTile3,70,10,20,20',
		'MagicTile4,10,40,20,20',
        'MagicTile5,40,40,20,20',
        'MagicTile6,70,40,20,20'
	]);

	let TileMap: any  = {'Tile1' :TileStrings1,
		'Tile2':TileStrings2
	}

	let TileStrings: string[] = [];
	let List: RS1.TileList = $state(new RS1.TileList([])); // remove temporarily

	let TileArray:any = $state([])
	let selectedTile: RS1.TDE = $state(new RS1.TDE(''))
	let VIDArray: RS1.vID[] | undefined = []
	let VIDStyle: RS1.vID[] | undefined = []
	let VIDAttribute: RS1.vID[] | undefined = []
	let VIDsArray = []
	const Str: string = '>'
	let step = $state('selectTile')
	let ListType = 'attributes'
	let currentEditor: any = null;
	let showPlot = $state(false)
	let villaPlot = $state(false)
	let isPanToggle = $state(true)
	let panAxis = $state('xy')
	let fileUploaded = false
	let newlyaddedTile: HTMLButtonElement | undefined = $state();
	let selectedVillaTile: number | undefined = $state();
	let photos = $state([]);
    let currentPhotoIndex = $state(0);
    let isShuffling = $state(true);
     
	function createTileList(TileStrings: string[]) {
		List = new RS1.TileList(TileStrings);
		TileArray = [];
		populateTileArray();
	}

	function getTileStrings(name:string) {
		return TileMap[name];
	}
	TileStrings = TileStrings1;	
	createTileList(TileStrings1);

	function populateTileArray() {
	TileArray = [];
	List.tiles.forEach(tile => {
		TileArray.push(tile)
		})
	}

	function handleTileDelete(event: CustomEvent) {
		const deletedTileIndex = event.detail.tileIndex;
  		List.tiles.splice(deletedTileIndex, 1);
  		List.Links();
		populateTileArray();
	}

	function tileLink(e: CustomEvent) {	
		let CurrentTileString = getTileStrings(e.detail.name);
		if (CurrentTileString) {
			createTileList(CurrentTileString);
		}
		TileStrings = CurrentTileString;
	}

	
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
	fileUploaded = true
  }
step = 'selectTile'

}

function AddVillaTile() {
	VillaTiles = [...VillaTiles, 'new tile']
}

function AddTile(tile:RS1.TDE, type: string) {
	const Tab = " ";
	let NewTileString: string = '';
	switch (type) {
		case 'Tile':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}T\ta|name:Tile|inner:|drag:true|\ts|height:10vh|width:10vw|background:yellow|transform:translate(0px, 0px)|\t`;
			break;
		
		case 'Button':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}Btn\ta|name:Button|inner:Button|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|\t`;
			break;

		case 'RoundButton':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}RndBtn\ta|name:Button|inner:Button|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|\t`;
			break;

		case 'TextEdit':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}Txt\ta|name:TextEdit|\ts|display:flex|width:10vh|height:10vw|background:#|\t`;
			break;

		case 'TextButton':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}TxtBtn\ta|name:TextButton|inner:save|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|border-radius:8px|\t`;
			break;

		case 'ImageButton':
			NewTileString = `${Tab.repeat(selectedTile.level+1)}ImgBtn\ta|name:ImageButton|\ts|display:flex|height:30px|width:70px|background:#1e1e1e|color:white|border-radius:8px|\t`;
			break;

	}
	TileStrings.splice(List.tiles.indexOf(selectedTile) + 1, 0, NewTileString);
	
	createTileList(TileStrings);
	
	step = 'selectTile';
	if (newlyaddedTile) newlyaddedTile.focus();
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
			}
		}
	}
	// $: if (step === 'editTile') {
	//     Edit(selectedTile);
	// }
	
	onMount(() => {
		const handleTogglePlot = (event: any) => {
			showPlot = event.detail.showPlot;
		};
		window.addEventListener('toggle-plot-view', handleTogglePlot);

		return () => {
			window.removeEventListener('toggle-plot-view', handleTogglePlot);
		};
	});

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
					<div class="content-wrapper">
		 				<button onclick={() => selectTile(tile)} class:selected={tile === selectedTile} bind:this={newlyaddedTile} >
	      					<span>{Str.repeat(tile.level)}{tile.aList?.descByName('name')} [{tile.TList?.listName.replace(/^\s+/, '')}]</span>
		 				</button>
		 			</div>
	    		{/each}
			</div>
	  		<!-- <button>Add Tile</button> -->
	  		<button onclick={() => showPlot = !showPlot}>Plot</button>
			  <div class='selectContainer'>
	    		{#each VillaTiles as tile,i}
					<div class="content-wrapper">
						<input value={tile} class:selected={selectedVillaTile === i} onclick={() => selectedVillaTile = i} oninput={(e) => VillaTiles[i] = (e.target as HTMLInputElement)?.value}/>
		 			</div>
	    		{/each}
			</div>
			<div class="options">
				<button onclick={() => {showPlot = !showPlot; villaPlot = !villaPlot;}}>Plot</button>
				<button onclick={AddVillaTile}>Add</button>
				<button onclick={() => {if (selectedVillaTile) VillaTiles.splice(selectedVillaTile,1);}}>Delete</button>
			</div>
		{/if}
	  	{#if step === 'editTile'}
	  		<div class="options">
				<button onclick={() => {ListType = 'attributes'; Edit(selectedTile)}}>Attributes</button>
				<button onclick={() => {ListType = 'styles'; Edit(selectedTile)}}>Styles</button>
				<button>
					<label for="file-upload">Add Image</label>
					<input id="file-upload" type="file" onchange={(event) => handleUpload(event,selectedTile)} style="display: none;" />
				</button>
				<button onclick={() => AddTile(selectedTile,'Tile')}>Add Tile</button>
				<button onclick={() => AddTile(selectedTile,'Button')}>Add Button</button> 
				<button onclick={() => AddTile(selectedTile,'RoundButton')}>Add Round Button</button> 
				<button onclick={() => AddTile(selectedTile,'ImageButton')}>Add Image Button</button>
				<button onclick={() => AddTile(selectedTile,'TextEdit')}>Add Text Edit</button> 
				<button onclick={() => AddTile(selectedTile,'TextButton')}>Add Text Save</button>  
		
				<div class='editContainer'></div>
		
				<!-- <button onclick={() => step = 'selectTile'}>Back</button>
				<button>Add Tile</button>  -->
	  		</div>
	  {/if}
	
	</div>
</div>
{/if}

{#if showPlot}
	{#if villaPlot}
	<!-- <button onclick={() => {showPlot = !showPlot; villaPlot = !villaPlot}}>Editor</button> -->
	<villa-plotter tileList={VillaTiles}></villa-plotter>
	{:else}
		
		<tile-list-renderer _panToggle = {isPanToggle} _panAxis = {panAxis} ontileLink={tileLink} TList={List} showPlot={showPlot}></tile-list-renderer>
	{/if}
{/if}


<style>
	.selectContainer {
		width:   100%;
		height: 300px;
		padding:   10px;
		border-radius:   8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
		background-color: white;
		color: black;
   }
 
   .content-wrapper {
        width: 100%;
		overflow-y: auto;
        }

   .content-wrapper button {
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		margin-bottom: 4px;
		transition: background-color 0.3s ease;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		font-family: inherit;
		font-size: inherit;
		color: inherit;
		display: block;
		}

	.content-wrapper button:hover,
	.content-wrapper button.selected {
		background-color: #3297FD;
		color: white;
		}

	.content-wrapper input:hover,
	.content-wrapper input.selected {
		background-color: #3297FD;
		color: white;
		}

    input {
		width: 100%;
		height:   32px;
		border-radius:   8px;
		font-family: inherit;
		outline: none;
		border: none;
		padding-left:   5px;
		transition:   0.1s linear;
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

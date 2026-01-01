<script lang="ts">
	import T from '../../components/tiles/T.svelte';

	function handleTileLink(link: string) {
		alert(`VillaLink clicked! Link: ${link}`);
	}

	function handleDelete() {
		alert('Delete button clicked!');
	}

	function handlePositionUpdate(x: number, y: number) {
		console.log('Position updated:', x, y);
	}

	function handleSizeUpdate(width: number, height: number) {
		console.log('Size updated:', width, height);
	}
</script>

<div class="full-page">
	<div class="tile-grid">
		<!-- Basic Tiles -->
		<T
			id="basic-div"
			styles="width: 200px; height: 200px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px;"
			content="Basic Div"
		/>
		<T
			id="basic-button"
			element="button"
			styles="width: 200px; height: 200px; background: #f093fb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;"
			content="Basic Button"
		/>

		<!-- Click Actions -->
		<T
			id="redirect-tile"
			clickAction="Redirect"
			redirect="https://google.com"
			styles="width: 200px; height: 200px; background: #4facfe; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;"
			content="Redirect"
		/>
		<T
			id="alert-tile"
			clickAction="Alert"
			alertContent="Hello! This is an alert!"
			styles="width: 200px; height: 200px; background: #fa709a; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;"
			content="Alert"
		/>
		<T
			id="villalink-tile"
			clickAction="VillaLink"
			link="SampleVilla"
			onTileLink={handleTileLink}
			styles="width: 200px; height: 200px; background: #30cfd0; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;"
			content="VillaLink"
		/>

		<!-- Text Formatting -->
		<T
			id="bold-tile"
			clickAction="Bold"
			styles="width: 200px; height: 200px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 48px;"
			content="B"
		/>
		<T
			id="italic-tile"
			clickAction="Italic"
			styles="width: 200px; height: 200px; background: #764ba2; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; font-style: italic; font-size: 48px;"
			content="I"
		/>
		<T
			id="underline-tile"
			clickAction="Underline"
			styles="width: 200px; height: 200px; background: #f093fb; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; text-decoration: underline; font-size: 48px;"
			content="U"
		/>

		<!-- Drag & Drop -->
		<T
			id="drag-xy"
			drag={true}
			dragAxis="xy"
			styles="width: 200px; height: 200px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: move; position: relative;"
			content="Drag XY"
			onPositionUpdate={handlePositionUpdate}
		/>
		<T
			id="drag-x"
			drag={true}
			dragAxis="x"
			styles="width: 200px; height: 200px; background: #f093fb; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: move; position: relative;"
			content="Drag X"
			onPositionUpdate={handlePositionUpdate}
		/>
		<T
			id="drag-y"
			drag={true}
			dragAxis="y"
			styles="width: 200px; height: 200px; background: #4facfe; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: move; position: relative;"
			content="Drag Y"
			onPositionUpdate={handlePositionUpdate}
		/>

		<!-- Resize -->
		<T
			id="resize-tile"
			resize={true}
			styles="width: 200px; height: 200px; background: #fa709a; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative;"
			content="Resize"
			onSizeUpdate={handleSizeUpdate}
			onPositionUpdate={handlePositionUpdate}
		/>
		<T
			id="drag-resize-tile"
			drag={true}
			resize={true}
			styles="width: 200px; height: 200px; background: #30cfd0; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative; cursor: move;"
			content="Drag & Resize"
			onSizeUpdate={handleSizeUpdate}
			onPositionUpdate={handlePositionUpdate}
		/>

		<!-- Swipe -->
		<T
			id="swipe-tile"
			swipe={true}
			styles="width: 200px; height: 200px; background: #a8edea; color: #333; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;"
			content="Swipe"
		/>

		<!-- Hold -->
		<T
			id="hold-tile"
			hold={true}
			styles="width: 200px; height: 200px; background: #ffecd2; color: #333; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;"
			content="Hold"
		/>

		<!-- Hover -->
		<T
			id="hover-tile"
			hover={true}
			styles="width: 200px; height: 200px; background: #ff9a9e; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.3s ease;"
			content="Hover"
		/>

		<!-- Text Editing -->
		<T
			id="edit-text-preview"
			innerEdit={true}
			textPreview={true}
			styles="width: 200px; height: 200px; background: #a1c4fd; color: #333; display: flex; align-items: center; justify-content: center; border-radius: 8px; padding: 10px;"
			content="Edit Text"
		/>
		<T
			id="edit-text-always"
			innerEdit={true}
			textPreview={false}
			styles="width: 200px; height: 200px; background: #fad0c4; color: #333; display: flex; align-items: center; justify-content: center; border-radius: 8px; padding: 10px;"
			content="Always Edit"
		/>

		<!-- Background Image -->
		<T
			id="bg-image-tile"
			bgImage={true}
			styles="width: 200px; height: 200px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative;"
			content="BG Image"
		/>

		<!-- Delete -->
		<T
			id="delete-tile"
			onDelete={handleDelete}
			styles="width: 200px; height: 200px; background: #f093fb; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative;"
			content="Delete"
		/>

		<!-- Full Featured -->
		<T
			id="full-featured"
			drag={true}
			resize={true}
			hover={true}
			clickAction="Alert"
			alertContent="Full featured tile!"
			onDelete={handleDelete}
			styles="width: 200px; height: 200px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative; cursor: move;"
			content="Full Featured"
			onSizeUpdate={handleSizeUpdate}
			onPositionUpdate={handlePositionUpdate}
		/>
	</div>
</div>

<style>
    :global(html),
:global(body) {
	margin: 0;
	padding: 0;
	width: 100%;
	height: 100%;
	overflow-x: hidden;
}

:global(body) {
	background: #f5f5f5;
}

/* If using SvelteKit layout wrappers */
:global(#svelte),
:global(.container),
:global(main) {
	width: 100%;
	min-height: 100vh;
	margin: 0;
	padding: 0;
}

.full-page {
	width: 100%;
	min-height: 100vh;
	padding: 40px 24px;
	box-sizing: border-box;
	overflow-y: auto;
}

.tile-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
	width: 100%;
}

@media (max-width: 768px) {
	.tile-grid {
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 15px;
	}
}

</style>
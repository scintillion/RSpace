<script lang="ts">
	let attrStr = `class = "main" id='1'`;
	let styleStr = "height: 100px; width: 100px; background-color: red;";
	import MTile from "../../components/TileComponents/MTile.svelte";
</script>

<div class="container">
	<MTile AttrStr={attrStr} StyleStr={styleStr} />
</div>

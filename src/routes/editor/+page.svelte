<script lang="ts">
  import { RS1 } from '$lib/RS';
	import Editor from '../../components/tiles/Editor.svelte';

	let CLString =
		'Test|Name:[%=Mahir]Your Name|XY:[#=123]A Number Value|Member:[@Test1=ListNum]TestMem|Set:[{Test1=ListNum,Test1Name]TestSet|';
</script>

<Editor {CLString} Pack={new RS1.BufPack()} />

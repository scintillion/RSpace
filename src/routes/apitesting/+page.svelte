<script lang="ts">
	import { onMount } from 'svelte';

	import { InitClient } from '$lib/API/client/request';
	import { RS1 } from '$lib/RS';

	onMount(async () => {

		let Pack = RS1.sql.bSelDel ('S',0,'D');
		let Reply = await RS1.ReqPack (Pack);	//	 delete all in S tile
		console.log ('DelReply:\n' + Reply.desc);

		console.log ('Insert Requests:');
		for (const List of RS1.CL.Lists) {
			let Write = await List.toDB ();
			console.log ('Write=' + Write + ' Name:' + List.Name + ' Str=' + List.Str);
			}

		let BP = await RS1.ReqStr ('SELECT * from S;','S');	//	('SELECT name from sqlite_master;');
		console.log ('Select Tile S\n' + BP.expand);

		let Tables = await RS1.ReqTiles ();

		let Names = await RS1.ReqNames ('S','List');

		let Info = new RS1.ReqInfo ();
		Info.Type = 'List';
		let Lists = await RS1.ReqByInfo (Info);
		console.log (Lists.length.toString () + ' Lists returned!');
	});


</script>

<h1>Request and Response will be logged to console!!!</h1>

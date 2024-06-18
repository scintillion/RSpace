<script lang="ts">
    import RListEditor from '../../lib/rListEditor.svelte';
    import rListEditor from '../../lib/rListEditor.svelte';
    import { RS1 } from '../../lib/RS';

    const rString = [
		'T\ta|name:Full|\ts|display:flex|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|background-image:url("")|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:none|justify-content:space-evenly|background-image:url("")|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|gap:5px|background-image:url("")|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|display:flex|width:70px|height:30px|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|background-image:url("")|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|display:flex|width:20vw|height:90vh|background-image:url("")|\t'
	];

	// const rString = [
	// 	'Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|',
	// 	'Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|',
	// 	'Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|',
	// 	'Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|',
	// 	'Rt:Return|Ok|Fail|Equal|Unequal|Queue|',
	// 	'Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|'

	// ]
    const list = new RS1.rList(rString);
    
</script>

<main>
    <RListEditor RSD={list} />
</main>
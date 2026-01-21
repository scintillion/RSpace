<script lang="ts">
	import GeneralizedListEditor from '$lib/GeneralizedListEditor.svelte';
	import { RS1 } from '$lib/RS';

	// Example qList
	let qListString = 'Test|Name:[%=John]Your Name|XY:[#=123]A Number Value|Member:[@Test1=ListNum]TestMem|Set:[{Test1=ListNum,Test1Name}]TestSet|';
	let qList = $state(new RS1.qList(qListString));

	// Example rList for Member/Set support
	let rListString = 'Test1|ListNum:[#=1]First|ListNum2:[#=2]Second|';
	let rList = $state(new RS1.rList(rListString));

	// Example xList (base type)
	let xList = $state(new RS1.qList('Example|Field1:Value1|Field2:Value2|'));

	function handleClose() {
		console.log('Editor closed');
	}

	function switchToList(type: 'qList' | 'xList') {
		if (type === 'qList') {
			// qList is already set
		} else {
			xList = new RS1.qList('Example|Field1:Value1|Field2:Value2|');
		}
	}
</script>

<main>
	<div class="container">
		<h1>Generalized List Editor</h1>
		<p>This editor supports qList, sList (qList property), and xList types</p>

		<div class="controls">
			<button onclick={() => switchToList('qList')}>Use qList</button>
			<button onclick={() => switchToList('xList')}>Use xList</button>
		</div>

		<div class="editor-wrapper">
			<GeneralizedListEditor list={qList} {rList} onClose={handleClose} />
		</div>
	</div>
</main>

<style lang="scss">
	main {
		width: 100%;
		min-height: 100vh;
		padding: 20px;
		background: #f5f5f5;

		.container {
			max-width: 1200px;
			margin: 0 auto;
			background: white;
			border-radius: 8px;
			padding: 20px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

			h1 {
				margin: 0 0 10px 0;
				color: #333;
			}

			p {
				color: #666;
				margin: 0 0 20px 0;
			}

			.controls {
				display: flex;
				gap: 10px;
				margin-bottom: 20px;

				button {
					padding: 10px 20px;
					border-radius: 8px;
					border: none;
					background: black;
					color: white;
					cursor: pointer;
					transition: 0.3s linear;
					font-family: inherit;

					&:hover {
						background: #3297FD;
					}
				}
			}

			.editor-wrapper {
				width: 100%;
			}
		}
	}
</style>
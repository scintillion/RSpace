<script lang="ts">
	import { RS1 } from './RS';

	interface Props {
		list: RS1.xList;
		rList?: RS1.rList | null;
		onClose?: () => void;
	}

	let { list, rList = null, onClose }: Props = $props();

	// State
	let selectedVID: RS1.vID | null = $state(null);
	let vIDs: RS1.vID[] = $state([]);
	let isEditing = $state(false);

	// Field values
	let name = $state('');
	let description = $state('');
	let format = $state('');
	let value = $state('');
	let fmtstr = $state('');
	let listSelect = $state('');
	let vIDSelect = $state('');

	// UI state
	let showMemberFields = $state(false);
	let showSetFields = $state(false);

	// Formats
	const formats: RS1.qList = RS1.rLoL.FT as RS1.qList;
	const TypeArray = RS1.TypeNames;

	// Initialize
	$effect(() => {
		loadVIDs();
	});

	function loadVIDs() {
		// Get fresh vIDs from the list
		let freshVIDs: RS1.vID[];
		if ('toSortedVIDs' in list && typeof list.toSortedVIDs !== 'undefined') {
			freshVIDs = list.toSortedVIDs;
		} else {
			freshVIDs = list.toVIDs;
		}
		// Create a new array to trigger reactivity
		vIDs = [...freshVIDs];
	}

	function selectVID(vID: RS1.vID) {
		selectedVID = vID;
		isEditing = true;
		
		name = vID.Name;
		let fullDesc = vID.Desc || '';
		
		if (!vID.Fmt) {
			vID.Fmt = new RS1.IFmt('');
		}
		
		const rawFMT = vID.Fmt as RS1.IFmt;
		format = rawFMT.TypeStr || '';
		value = rawFMT.Value?._Str as string || '';
		fmtstr = rawFMT.Xtra || '';
		
		const formatDesc = formats?.descByName(rawFMT.Ch) as string;
		
		// Parse Member format: [@ListName=vIDName]Description
		if (formatDesc === 'Member') {
			showMemberFields = true;
			showSetFields = false;
			const memberMatch = fullDesc.match(/\[@([^=]+)=([^\]]+)\](.*)/);
			if (memberMatch) {
				listSelect = memberMatch[1];
				vIDSelect = memberMatch[2];
				description = memberMatch[3] || '';
			} else {
				description = fullDesc;
			}
		} 
		// Parse Set format: [{ListName=vID1,vID2}]Description
		else if (formatDesc === 'Set') {
			showMemberFields = true;
			showSetFields = true;
			const setMatch = fullDesc.match(/\[\{([^=]+)=([^\}]+)\}\](.*)/);
			if (setMatch) {
				listSelect = setMatch[1];
				vIDSelect = setMatch[2]; // Comma-separated values
				description = setMatch[3] || '';
			} else {
				description = fullDesc;
			}
		} else {
			showMemberFields = false;
			showSetFields = false;
			description = fullDesc;
		}
	}

	function loadMemberFields() {
		// This is handled reactively in the template
		// The select elements will update based on rList state
	}

	function handleFormatChange() {
		if (format === 'Member') {
			showMemberFields = true;
			showSetFields = false;
		} else if (format === 'Set') {
			showMemberFields = true;
			showSetFields = true;
		} else {
			showMemberFields = false;
			showSetFields = false;
		}
	}

	function saveVID() {
		if (!name) {
			alert('Name is required');
			return;
		}

		let vID: RS1.vID = new RS1.vID('');
		vID.Name = name;
		vID.Desc = description;
		vID.Fmt = new RS1.IFmt('');

		if (format && value) {
			if (!checkFormat(value, format)) {
				alert('Error: Invalid Format');
				return;
			}
			vID.Fmt.setType(format);
			vID.Fmt.setValue(value);
		}

		if (fmtstr) {
			vID.Fmt.setXtra(fmtstr);
		}

		// Handle Member and Set types
		if (format === 'Member' && listSelect && vIDSelect) {
			vID.Desc = `[@${removeWhitespace(listSelect)}=${removeWhitespace(vIDSelect)}]${description}`;
		} else if (format === 'Set' && listSelect && vIDSelect) {
			// For Set, vIDSelect may contain comma-separated values if multiple selected
			vID.Desc = `[{${removeWhitespace(listSelect)}=${vIDSelect}}]${description}`;
		} else if (format && value) {
			// Regular format with value
			vID.Desc = description;
		} else {
			// Just description
			vID.Desc = description;
		}

		const wasEditing = selectedVID !== null;
		const savedName = name;
		
		list.setVID(vID);
		// Force UI update by reloading vIDs
		loadVIDs();
		
		// If we were editing an existing vID, reselect it to show updated values
		if (wasEditing) {
			// Get fresh vIDs after update
			let freshVIDs: RS1.vID[];
			if ('toSortedVIDs' in list && typeof list.toSortedVIDs !== 'undefined') {
				freshVIDs = list.toSortedVIDs;
			} else {
				freshVIDs = list.toVIDs;
			}
			const updatedVID = freshVIDs.find(v => v.Name === savedName);
			if (updatedVID) {
				// Update the vIDs array and reselect
				vIDs = [...freshVIDs];
				selectVID(updatedVID);
			}
		} else {
			clearFields();
		}
		
		console.log('New listStr:', list.to$);
	}

	function deleteVID() {
		if (selectedVID) {
			list.del(selectedVID.Name);
			loadVIDs();
			clearFields();
		}
	}

	function copyVID() {
		if (selectedVID) {
			const newVID = selectedVID.copy;
			newVID.Name = `${newVID.Name} Copy`;
			newVID.List = list;
			list.setVID(newVID);
			loadVIDs();
			clearFields();
		}
	}

	function moveVID(direction: 'up' | 'down') {
		if (selectedVID) {
			const dir = direction === 'up' ? -1 : 1;
			list.bubble(selectedVID.Name, dir);
			loadVIDs();
		}
	}

	function addNewVID() {
		clearFields();
		isEditing = false;
		// Fields are already cleared, ready for new input
	}

	function clearFields() {
		selectedVID = null;
		isEditing = false;
		name = '';
		description = '';
		format = '';
		value = '';
		fmtstr = '';
		listSelect = '';
		vIDSelect = '';
		showMemberFields = false;
		showSetFields = false;
	}

	function checkFormat(value: string, format: string): boolean {
		if (!format) return false;

		value = value.trim();

		switch (format) {
			case 'Integer':
				return /^\d+$/.test(value);
			case 'String':
				return true;
			case 'Number':
				return isNum(value);
			case 'Dollar':
				return /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/.test(value);
			case 'Range':
				return /^\d+$/.test(value);
			case 'Numbers':
				return /^\s*\d+\s*(,\s*\d+\s*)*$/.test(value);
			case 'UpperCase':
				return value.toUpperCase() === value;
			case 'Ordinal':
				return /^\d{1,2}(st|nd|rd|th)$/.test(value);
			case 'Pair':
				return /^\s*\d+\s*,\s*\d+\s*$/.test(value);
			default:
				return false;
		}
	}

	function isNum(v: string): boolean {
		const num = parseFloat(v);
		return !isNaN(num) && isFinite(num);
	}

	function removeWhitespace(str: string): string {
		return str.replace(/(\s+Bad\s+List\s+Name\s+|\s+)/g, '');
	}

	function removePossibleDelim(str: string): string {
		return str.replace(/[\t\n\f|:]/g, '');
	}
</script>

<div class="editor">
	<div class="listContainer">
		<div class="selectContainer">
			<select 
				size="10" 
				multiple 
				class="listSelect"
				onchange={(e) => {
					const target = e.target as HTMLSelectElement;
					const selectedName = target.value;
					const vID = vIDs.find(v => v.Name === selectedName);
					if (vID) selectVID(vID);
				}}
			>
				{#each vIDs as vID (vID.Name)}
					<option value={vID.Name} selected={selectedVID?.Name === vID.Name}>
						{vID.Name}: {vID.Desc}
					</option>
				{/each}
			</select>
		</div>

		<div class="fieldOperations">
			<div class="fields" id="Line1">
				<label for="name">Name: </label>
				<input 
					type="text" 
					id="name" 
					name="name" 
					bind:value={name}
					placeholder="Name (required)"
					readonly={isEditing && selectedVID !== null}
				/>
				<label for="desc">Desc: </label>
				<input 
					type="text" 
					id="desc" 
					name="desc" 
					bind:value={description}
					placeholder="Description"
				/>
			</div>

			<div class="fields" id="Line2">
				<label for="format">ValueType: </label>
				<select 
					id="format" 
					name="format"
					bind:value={format}
					onchange={handleFormatChange}
				>
					<option value="">Select Format</option>
					{#each TypeArray as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
				<label for="value">Value:</label>
				<input 
					type="text" 
					id="value" 
					name="value" 
					bind:value={value}
					style:display={showMemberFields ? 'none' : 'block'}
				/>
				<label for="fmtstr">XtraStr:</label>
				<input 
					type="text" 
					id="fmtstr" 
					name="fmtstr" 
					bind:value={fmtstr}
				/>
			</div>

			{#if showMemberFields}
				<div class="fields" id="Line3">
					<label for="list">List:</label>
					<select 
						id="list" 
						name="list"
						bind:value={listSelect}
						onchange={() => {
							// Clear vID when list changes
							vIDSelect = '';
						}}
					>
						<option value="">Select List</option>
						{#if rList}
							{@const qList = rList.toQList}
							{#if qList}
								{#each qList.toVIDs || [] as listVID}
									<option value={listVID.Name}>{listVID.Name}</option>
								{/each}
							{/if}
						{/if}
					</select>
					<label for="vID">vID:</label>
					{#if showSetFields}
						<select 
							id="vID" 
							name="vID"
							multiple
							disabled={!listSelect}
							onchange={(e) => {
								const target = e.target as HTMLSelectElement;
								const selected = Array.from(target.selectedOptions).map(opt => opt.value);
								vIDSelect = selected.join(',');
							}}
						>
							{#if rList && listSelect}
								{@const selectedList = rList.qListByName(listSelect)}
								{#if selectedList}
									{#each selectedList.toVIDs || [] as vID}
										{@const isSelected = vIDSelect.split(',').includes(vID.Name)}
										<option value={vID.Name} selected={isSelected}>{vID.Name}</option>
									{/each}
								{/if}
							{/if}
						</select>
					{:else}
						<select 
							id="vID" 
							name="vID"
							bind:value={vIDSelect}
							disabled={!listSelect}
						>
							<option value="">Select vID</option>
							{#if rList && listSelect}
								{@const selectedList = rList.qListByName(listSelect)}
								{#if selectedList}
									{#each selectedList.toVIDs || [] as vID}
										<option value={vID.Name}>{vID.Name}</option>
									{/each}
								{/if}
							{/if}
						</select>
					{/if}
				</div>
			{/if}

			<div class="buttons">
				<button onclick={saveVID}>Save</button>
				<button onclick={addNewVID}>Add</button>
				<button onclick={deleteVID} disabled={!selectedVID}>Delete</button>
				<button onclick={clearFields}>Clear</button>
				<button onclick={copyVID} disabled={!selectedVID}>Copy</button>
				<button onclick={() => moveVID('up')} disabled={!selectedVID}>Up</button>
				<button onclick={() => moveVID('down')} disabled={!selectedVID}>Down</button>
				{#if onClose}
					<button onclick={onClose}>Back</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.editor {
		width: 100%;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 20px;
		padding: 10px;

		.listContainer {
			display: flex;
			align-items: flex-start;
			justify-content: center;
			flex-direction: row;
			gap: 20px;
			width: 100%;
			max-width: 900px;

			.selectContainer {
				width: 300px;
				height: auto;
				max-height: 500px;
				overflow-y: auto;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				background-color: white;
				padding: 10px;

				.listSelect {
					width: 100%;
					height: 100%;
					padding: 3px;
					border-radius: 5px;
					border: 1px solid #ddd;
					font-family: inherit;
					outline: none;
					background: white;
					color: black;

					option {
						padding: 5px;
						cursor: pointer;

						&:hover {
							background-color: #3297FD;
							color: white;
						}
					}
				}
			}

			.fieldOperations {
				flex: 1;
				display: flex;
				justify-content: center;
				flex-direction: column;
				gap: 15px;

				.fields {
					display: flex;
					flex-direction: column;
					gap: 10px;
					width: 100%;

					label {
						font-weight: 500;
						color: #333;
					}

					input,
					select {
						width: 100%;
						height: 32px;
						border-radius: 8px;
						font-family: inherit;
						outline: none;
						border: 1px solid #ddd;
						padding-left: 10px;
						transition: 0.3s linear;
						background: white;
						color: black;

						&:focus {
							border-color: #3297FD;
							box-shadow: 0 0 0 2px rgba(50, 151, 253, 0.2);
						}

						&[readonly] {
							background-color: #f5f5f5;
							cursor: not-allowed;
						}
					}
				}

				.buttons {
					display: flex;
					flex-wrap: wrap;
					gap: 10px;
					justify-content: center;
					margin-top: 10px;

					button {
						width: 80px;
						height: 32px;
						border-radius: 8px;
						font-family: inherit;
						background: black;
						outline: none;
						border: none;
						cursor: pointer;
						color: white;
						transition: 0.3s linear;

						&:hover:not(:disabled) {
							background: #3297FD;
						}

						&:disabled {
							background: #ccc;
							cursor: not-allowed;
							opacity: 0.6;
						}
					}
				}
			}
		}
	}
</style>
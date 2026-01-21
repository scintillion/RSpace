<script lang="ts">
	import { RS1 } from './RS';
	import { ListEditor } from './ListEditor';

	interface Props {
		list: RS1.xList;
		rList?: RS1.rList | null;
		onClose?: () => void;
	}

	let { list, rList = null, onClose }: Props = $props();

	// ListEditor instance - use $derived to react to prop changes
	const editor = $derived(new ListEditor(list, rList));

	// State
	let selectedVID: RS1.vID | null = $state(null);
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
	const TypeArray = $derived(editor.getTypeArray());
	
	// Derived vIDs from editor
	const vIDs = $derived(editor.getVIDs());

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
					if (vID) {
						selectedVID = vID;
						isEditing = true;
						const result = editor.selectVID(vID);
						name = result.name;
						description = result.description;
						format = result.format;
						value = result.value;
						fmtstr = result.fmtstr;
						listSelect = result.listSelect;
						vIDSelect = result.vIDSelect;
						showMemberFields = result.showMemberFields;
						showSetFields = result.showSetFields;
					}
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
					onchange={() => {
						const result = editor.handleFormatChange(format);
						showMemberFields = result.showMemberFields;
						showSetFields = result.showSetFields;
					}}
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
				<button onclick={() => {
					const result = editor.saveVID(
						name,
						description,
						format,
						value,
						fmtstr,
						listSelect,
						vIDSelect,
						selectedVID
					);
					if (!result.success) return;
					if (result.updatedVID) {
						selectedVID = result.updatedVID;
						isEditing = true;
						const selectResult = editor.selectVID(result.updatedVID);
						name = selectResult.name;
						description = selectResult.description;
						format = selectResult.format;
						value = selectResult.value;
						fmtstr = selectResult.fmtstr;
						listSelect = selectResult.listSelect;
						vIDSelect = selectResult.vIDSelect;
						showMemberFields = selectResult.showMemberFields;
						showSetFields = selectResult.showSetFields;
					} else {
						clearFields();
					}
				}}>Save</button>
				<button onclick={() => {
					clearFields();
					isEditing = false;
				}}>Add</button>
				<button onclick={() => {
					if (selectedVID) {
						editor.deleteVID(selectedVID);
						clearFields();
					}
				}} disabled={!selectedVID}>Delete</button>
				<button onclick={clearFields}>Clear</button>
				<button onclick={() => {
					if (selectedVID) {
						editor.copyVID(selectedVID);
						clearFields();
					}
				}} disabled={!selectedVID}>Copy</button>
				<button onclick={() => {
					if (selectedVID) {
						editor.moveVID(selectedVID, 'up');
					}
				}} disabled={!selectedVID}>Up</button>
				<button onclick={() => {
					if (selectedVID) {
						editor.moveVID(selectedVID, 'down');
					}
				}} disabled={!selectedVID}>Down</button>
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
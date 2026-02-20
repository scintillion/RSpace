import { RS1 } from './RS';

export class ListEditor {
	public list: RS1.xList;
	public rList?: RS1.rList;
	private formats: RS1.qList;
	private TypeArray: string[];

	constructor(list: RS1.xList, rList: RS1.rList | undefined = undefined) {
		this.list = list;
		this.rList = rList;
		this.formats = RS1.rLoL.FT as RS1.qList;
		this.TypeArray = RS1.TypeNames;
	}

	/** Public Methods */

	public getVIDs(): RS1.vID[] {
		// Get fresh vIDs from the list
		let freshVIDs: RS1.vID[];
		if ('toSortedVIDs' in this.list && typeof this.list.toSortedVIDs !== 'undefined') {
			freshVIDs = this.list.qToSortedVIDs;
		} else {
			freshVIDs = this.list.qToVIDs;
		}
		// Create a new array to trigger reactivity
		return [...freshVIDs];
	}

	public selectVID(vID: RS1.vID): {
		name: string;
		description: string;
		format: string;
		value: string;
		fmtstr: string;
		listSelect: string;
		vIDSelect: string;
		showMemberFields: boolean;
		showSetFields: boolean;
	} {
		let fullDesc = vID.Desc || '';
		
		if (!vID.Fmt) {
			vID.Fmt = new RS1.IFmt('');
		}
		
		const rawFMT = vID.Fmt as RS1.IFmt;
		const format = rawFMT.TypeStr || '';
		const value = rawFMT.Value?._Str as string || '';
		const fmtstr = rawFMT.Xtra || '';
		
		const formatDesc = this.formats?.qDescByName(rawFMT.Ch) as string;
		
		let listSelect = '';
		let vIDSelect = '';
		let description = '';
		let showMemberFields = false;
		let showSetFields = false;
		
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

		return {
			name: vID.Name,
			description,
			format,
			value,
			fmtstr,
			listSelect,
			vIDSelect,
			showMemberFields,
			showSetFields
		};
	}

	public handleFormatChange(format: string): {
		showMemberFields: boolean;
		showSetFields: boolean;
	} {
		if (format === 'Member') {
			return {
				showMemberFields: true,
				showSetFields: false
			};
		} else if (format === 'Set') {
			return {
				showMemberFields: true,
				showSetFields: true
			};
		} else {
			return {
				showMemberFields: false,
				showSetFields: false
			};
		}
	}

	public saveVID(
		name: string,
		description: string,
		format: string,
		value: string,
		fmtstr: string,
		listSelect: string,
		vIDSelect: string,
		selectedVID?: RS1.vID): { success: boolean; updatedVID?: RS1.vID; listStr: string } {
		if (!name) {
			alert('Name is required');
			return { success: false, listStr: this.list.to$ };
		}

		let vID: RS1.vID = new RS1.vID('');
		vID.Name = name;
		vID.Desc = description;
		vID.Fmt = new RS1.IFmt('');

		if (format && value) {
			if (!this.CheckFormat(value, format)) {
				alert('Error: Invalid Format');
				return { success: false, listStr: this.list.to$ };
			}
			vID.Fmt.setType(format);
			vID.Fmt.setValue(value);
		}

		if (fmtstr) {
			vID.Fmt.setXtra(fmtstr);
		}

		// Handle Member and Set types
		if (format === 'Member' && listSelect && vIDSelect) {
			vID.Desc = `[@${this.RemoveWhitespace(listSelect)}=${this.RemoveWhitespace(vIDSelect)}]${description}`;
		} else if (format === 'Set' && listSelect && vIDSelect) {
			// For Set, vIDSelect may contain comma-separated values if multiple selected
			vID.Desc = `[{${this.RemoveWhitespace(listSelect)}=${vIDSelect}}]${description}`;
		} else if (format && value) {
			// Regular format with value
			vID.Desc = description;
		} else {
			// Just description
			vID.Desc = description;
		}

		const wasEditing = selectedVID;
		const savedName = name;
		
		this.list.qSetVID(vID);
		
		// If we were editing an existing vID, get the updated one
		let updatedVID: RS1.vID | undefined;
		if (wasEditing) {
			// Get fresh vIDs after update
			let freshVIDs: RS1.vID[];
			if ('toSortedVIDs' in this.list && typeof this.list.toSortedVIDs !== 'undefined') {
				freshVIDs = this.list.qToSortedVIDs;
			} else {
				freshVIDs = this.list.qToVIDs;
			}
			updatedVID = freshVIDs.find(v => v.Name === savedName);
		}
		
		const listStr = this.list.to$;
		
		return {
			success: true,
			updatedVID,
			listStr
		};
	}

	public deleteVID(vID: RS1.vID): void {
		this.list.qDel(vID.Name);
	}

	public copyVID(vID: RS1.vID): RS1.vID {
		const newVID = vID.copy;
		newVID.Name = `${newVID.Name} Copy`;
		newVID.List = this.list;
		this.list.qSetVID(newVID);
		return newVID;
	}

	public moveVID(vID: RS1.vID, direction: 'up' | 'down'): void {
		const dir = direction === 'up' ? -1 : 1;
		this.list.qBubble(vID.Name, dir);
	}

	public getTypeArray(): string[] {
		return this.TypeArray;
	}

	public getFormats(): RS1.qList {
		return this.formats;
	}

	/** Private Methods */

	private CheckFormat(value: string, format: string): boolean {
		if (!format) return false;

		value = value.trim();

		switch (format) {
			case 'Integer':
				return /^\d+$/.test(value);
			case 'String':
				return true;
			case 'Number':
				return this.IsNum(value);
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

	private IsNum(v: string): boolean {
		const num = parseFloat(v);
		return !isNaN(num) && isFinite(num);
	}

	private RemoveWhitespace(str: string): string {
		return str.replace(/(\s+Bad\s+List\s+Name\s+|\s+)/g, '');
	}

	private RemovePossibleDelim(str: string): string {
		return str.replace(/[\t\n\f|:]/g, '');
	}
}
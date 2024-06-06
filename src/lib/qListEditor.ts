import { RS1 } from '$lib/RS';
import { Editor_TC, QEditor_TC } from '../components/tiles';

export class QEditor {
	private container: HTMLDivElement;
	private qList: RS1.qList;
	private selectbox: HTMLSelectElement;
	private i: {
		name: HTMLInputElement;
		description: HTMLInputElement;
		fmt: HTMLSelectElement;
		value: HTMLInputElement;
		fmtstr: HTMLInputElement;
		list: HTMLSelectElement;
		vID: HTMLSelectElement;
		save: HTMLButtonElement;
		del: HTMLButtonElement;
		clear: HTMLButtonElement;
		copy: HTMLButtonElement;
		up: HTMLButtonElement;
		down: HTMLButtonElement;
	}; // HTMLElement(s)
	private selectContainer: HTMLDivElement;
	private rList: RS1.rList;
	private formats: RS1.qList = RS1.rList.FT as RS1.qList;
	

	/** Public Functions (External Calls) */

	constructor(
		container: HTMLDivElement | null,
		qList: RS1.qList,
		rList: RS1.rList = RS1.NILrList,
		linkedqList?: RS1.qList
	) {
		// Constructor
		this.container = container as HTMLDivElement;
		this.qList = qList as RS1.qList;

		this.rList = rList


		// SelectBox
		this.selectContainer = this.container.querySelector('.selectContainer') as HTMLDivElement;
		const select = this.container.ownerDocument.createElement('select');
		this.selectbox = select as HTMLSelectElement;
		this.selectbox.style.width = '100%';
		this.selectbox.style.height = '100%';
		this.selectbox.style.paddingLeft = '5px';
		this.selectbox.style.borderRadius = '5px';
		this.selectbox.setAttribute('size', '10');
		this.selectbox.style.padding = '3px';
		this.selectbox.setAttribute('multiple', '');

		const firstLine: HTMLDivElement = this.container.querySelector(
			'.functions#Line1'
		) as HTMLDivElement;

		this.i = {
			name: this.container.querySelector("input[name='name']") as HTMLInputElement,
			description: this.container.querySelector("input[name='desc']") as HTMLInputElement,
			fmt: this.container.querySelector('select#format') as HTMLSelectElement,
			value: this.container.querySelector("input[name='value']") as HTMLInputElement,
			fmtstr: this.container.querySelector("input[name='fmtstr']") as HTMLInputElement,
			save: this.container.querySelector('#save') as HTMLButtonElement,
			del: this.container.querySelector('#del') as HTMLButtonElement,
			clear: this.container.querySelector('#clear') as HTMLButtonElement,
			copy: this.container.querySelector('#copy') as HTMLButtonElement,
			up: this.container.querySelector('#up') as HTMLButtonElement,
			down: this.container.querySelector('#down') as HTMLButtonElement,
			list: firstLine.appendChild(this.container.ownerDocument.createElement('select')),
			vID: firstLine.appendChild(this.container.ownerDocument.createElement('select')),
		};

		this.i.vID.multiple = false;

		this.i.list.style.cssText =
			'display: none; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';
		this.i.vID.style.cssText =
			'display: none; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';

		/** Preset Event Handlers  */
		this.i.save.onclick = () => {
			if (this.selectbox.value) {
				//this.UpdateVID(this.i.name.value);
				this.CreateVID1();	
				this.Reload();
			} else {
				//this.CreateVID();
				this.CreateVID1();
				this.Reload();
			}
			
		};
		this.i.fmt.onselectionchange = () => this.FormatChangeHandler();
	}

	public Populate(): void {
		// public/Populate
		this.CLToSelect();

		const FirstVID: RS1.vID = this.qList.toSortedVIDs[0] as RS1.vID;

		const vIDs = this.qList.toSortedVIDs;
		this.selectbox.onchange = () => {
			const selected = this.selectbox.value;
			const VID: RS1.vID = vIDs.find((VID) => VID.Name === selected) as RS1.vID;
			this.DefineFields(VID);
		};
	}

	public Destroy(): void {
		// public/Destroy
		this.selectbox.onchange = () => {};
		this.selectbox.outerHTML = '';
		this.ClearRef();
	}

	public Reload(): void {
		this.Destroy();
		this.Populate();
	}

	/** Start of Private Functions (Internal Use Only)  */

	private CLToSelect(reload?: boolean): void {
		if (reload && reload === true) {
			this.selectbox.innerHTML = '';
		}

		this.qList.toSelect(this.selectbox);
		this.selectContainer.appendChild(this.selectbox);
	}

	private ClearRef(): void {
		this.UnloadMemberAndSetFields();
		this.i.name.readOnly = false;
		this.i.description.value = '';
		this.i.fmt.value = '';
		this.i.name.value = '';
		this.i.value.value = '';
		this.i.fmtstr.value = '';
		this.selectbox.selectedIndex = -1;
	}

	private DefineFields(vID: RS1.vID): void {
		if (vID) {
			this.i.name.value = vID.Name;
			if (this.i.name.value) {
			this.i.name.readOnly = true;
			}
			this.i.description.value = vID.Desc		

			console.log(vID.Fmt?.Ch !== '');

			if (vID.Fmt) {
				const rawFMT = vID.Fmt as RS1.IFmt;
				const format1: string = rawFMT.TypeStr;
				const format = this.formats.x.GetDesc(rawFMT.Ch) as string;
				
				if (format === 'Member') {
					this.LoadMemberAndSetFields();
				} else if (format === 'Set') {
					this.LoadMemberAndSetFields('Set');
				} else this.UnloadMemberAndSetFields();

				//this.i.fmtstr.value = rawFMT.Str.slice(format.length);
				this.i.fmtstr.value = rawFMT.Xtra;
				this.i.fmt.value = format1;
				console.log('format is ' + format1);
				console.log('value is ' + rawFMT.Value._Str);
				this.i.value.value = rawFMT.Value._Str as string;
			} else {
				console.log('no format present')
				vID.Fmt = new RS1.IFmt('')
				return;
					}

			this.i.del.onclick = () => this.DeleteVID(vID.Name);
			this.i.clear.onclick = () => this.ClearRef();
			this.i.copy.onclick = () => this.CopyVID(vID);
			this.i.up.onclick = () => this.MoveElement('up', vID);
			this.i.down.onclick = () => this.MoveElement('down', vID);
		
	} else return;
	}

	private LoadMemberAndSetFields(field?: string) {
		console.log('LoadMemberAndSetFields');
		this.i.value.style.display = 'none';
		this.i.list.style.cssText =
			'display: block; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';
		const CL = this.rList.toQList as RS1.qList;
		CL.toSelect(this.i.list);
		this.i.vID.style.cssText =
			'display: block; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';
		this.i.list.onchange = () => {
			const List = this.rList.qListByName(this.i.list.value) as RS1.qList;
			List.toSelect(this.i.vID);			
		};

		if (field === 'Set') {
			this.i.vID.multiple = true;
		}
	}

	private UnloadMemberAndSetFields() {
		this.i.list.style.cssText =
			'display: none; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';
		this.i.vID.style.cssText =
			'display: none; width: 100px; height: 40px; border-radius: 10px; font-family: inherit; outline: none; border: none; padding-left: 10px; transition: 0.3s linear;';
		this.i.value.style.display = 'block';
		this.i.vID.multiple = false;
	}

	private CreateVID(): void {
		const format: string = this.formats.nameByDesc(
			this.RemovePossibleDelim(this.i.fmt.value)
		) as string;
		let value: string = this.RemovePossibleDelim(this.i.value.value) as string;
		const fmtstr: string = this.RemovePossibleDelim(this.i.fmtstr.value) as string;
		let description: string = this.RemovePossibleDelim(this.i.description.value) as string;

		if (!this.checkFormat(value, format)) {
			alert('Error: Invalid Format');
			return;
		}

		let validDesc: string = `[${format}=${value}]${description}` as string;

		if (fmtstr) {
			validDesc = `[${format + fmtstr}=${value}]${description}` as string;
		}

		if (format === 'Member') {
			validDesc = `[@${this.RemoveWhitespace(this.i.list.value)}=${this.RemoveWhitespace(
				this.i.vID.value
			)}]${description}` as string;
		}

		if (format === 'Set') {
			const selected = this.GetSelected(this.i.vID).join(',');
			validDesc = `[{${this.RemoveWhitespace(this.i.list.value)}=${selected}]`;
		}

		// let vID: RS1.vID = new RS1.vID(this.i.name.value, this.vList);
		let vID: RS1.vID = new RS1.vID(this.i.name.value, this.qList);
		vID.Desc = validDesc;

		// Update vList
		// this.vList.x.UpdateVID(vID);
		this.qList.setVID(vID);
		this.CLToSelect();
		vID = vID.copy ;
		// vID.List = this.vList;
		// vID.List = this.qList; [ignore]
		this.ClearRef();
		console.log('Create', vID);
		// console.log('Create', this.vList.Str); [ignore]
	}

	private CreateVID1(): void {
		let vID: RS1.vID = new RS1.vID('');
		vID.Name = this.i.name.value;
		vID.Desc = this.i.description.value;
		vID.Fmt = new RS1.IFmt('')
		//let fmttype: RS1.IFmt | undefined = vID.Fmt;
		console.log('createVID' + this.i.value.value);
		console.log(this.i.fmt.value)

		if (this.i.fmt.value && this.i.value.value) {
			//fmttype.Format = this.formats.NameByDesc(this.i.fmt.value) as string;
			if (!this.checkFormat(this.i.value.value, this.i.fmt.value)) {
				alert('Error: Invalid Format');
				return;
			}
			vID.Fmt.setType(this.i.fmt.value);
			vID.Fmt.setValue(this.i.value.value)
		} 
		if (this.i.fmtstr.value) {
			const XtraStr: string = this.RemovePossibleDelim(this.i.fmtstr.value) as string;
			vID.Fmt.setXtra(XtraStr);
		}

	
		this.qList.setVID(vID);
		this.CLToSelect();
		vID = vID.copy ;
		// vID.List = this.vList;
		vID.List = this.qList; 
		this.ClearRef();
		console.log('Create', vID);
	


	}

	private GetSelected(Select: HTMLSelectElement): string[] {
		const response: string[] = [];
		for (let i = 0; i < Select.selectedOptions.length; i++) {
			response.push(Select.selectedOptions[i].value);
		}
		return response;
	}

	private UpdateVID(name: string): void {
		const format: string = this.formats.nameByDesc(
			this.RemovePossibleDelim(this.i.fmt.value)
		) as string;
		let value: string | number = this.RemovePossibleDelim(this.i.value.value);;
		const updatedName: string = this.RemovePossibleDelim(this.i.name.value) as string;
		const fmtstr: string = this.RemovePossibleDelim(this.i.fmtstr.value) as string;
		let description: string = this.RemovePossibleDelim(this.i.description.value) as string;

		if (format === 'A' && value.includes('[')) {
			value = value.replace(/[\[\]()]/g, '');
		}

		if (!this.checkFormat(value, format)) {
			alert('Error: Invalid Format');
			return;
		}

		let validDesc: string = `[${format}=${value}]${description}` as string;

		if (fmtstr) {
			validDesc = `[${format + fmtstr}=${value}]${description}` as string;
			console.log(validDesc);
		}

		if (format === 'Member') {
			console.log(this.i.list.value, 'this is the list selected');
			console.log(this.i.vID.value, 'this is the vID selected');
			validDesc = `[@${this.RemoveWhitespace(this.i.list.value)}=${this.RemoveWhitespace(
				this.i.vID.value
			)}]${description}` as string;
		}

		if (format === 'Set') {
			const selected = this.GetSelected(this.i.vID).join(',');
			validDesc = `[{${this.RemoveWhitespace(this.i.list.value)}=${selected}]`;
		}

		let vID = new RS1.vID(`${name}:${validDesc}`, this.qList);

		if (updatedName) {
			this.qList.setVID(vID);
			console.log(this.qList);
			this.setVIDName(vID,updatedName)
		}

		this.qList.setVID(vID);
		this.CLToSelect();
	 
		
		
	}

	private RemoveWhitespace(str: string): string {
		return str.replace(/(\s+Bad\s+List\s+Name\s+|\s+)/g, '');
	}

	private DeleteVID(name: string): void {
		// const vID: RS1.vID = this.vList.x.GetVID(name) as RS1.vID;
		// this.vList.x.UpdateVID(vID, true);
		const vID: RS1.vID = this.qList.getVID(name) as RS1.vID;
		this.qList.setVID(vID);
		this.CLToSelect();
		// console.log(this.vList.Str);
		// console.log(this.qList.Str); [ignore]
	}

	private CopyVID(vID: RS1.vID) {
		const newvID = vID.copy ;
		vID.List = this.qList;

		newvID.Name = `${newvID.Name} Copy`;
		// this.vList.x.UpdateVID(newvID, false);
		this.qList.setVID(newvID);
		this.ClearRef();
		this.Populate();
		// console.log(this.vList.Str); [ignore]
	}

	private MoveElement(direction: string, vID: RS1.vID): void {
		if (direction === 'up') {
			// this.vList.x.Bubble(vID.Name, -1);
			this.qList.bubble(vID.Name, -1);
			this.CLToSelect(true);
			return;
		} else if (direction === 'down') {
			// this.vList.x.Bubble(vID.Name, 1);
			this.qList.bubble(vID.Name, 1);
			this.CLToSelect(true);
			return;
		} else return;
	}

	private checkFormat(value: string, format: string): boolean {
		//const validFormat = this.formats.GetVID(format);
		const validFormat = format
		//console.log('valid format ' + validFormat?.Name);
		//console.log(validFormat?.Desc)

		if (!validFormat) {
			return false;
		}

		value = value.trim();

		switch (validFormat) {
			case 'Integer':
				return /^\d+$/.test(value);
				break;
			case 'String':
				return true;
				break;
			case 'Number':
				return this.isNum(value);
			case 'Dollar':
				return /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/.test(value);
				break;
			case 'Range':
				return /^\d+$/.test(value);
				break;
			case 'Numbers':
				return /^\s*\d+\s*(,\s*\d+\s*)*$/.test(value);
				break;
			case 'UpperCase':
				return value.toUpperCase() === value;
				break;
			case 'Ordinal':
				return /^\d{1,2}(st|nd|rd|th)$/.test(value);
				break;
			case 'Pair':
				return /^\s*\d+\s*,\s*\d+\s*$/.test(value);
				break;
			// case 'Null':
			// 	return value === '';
			// 	break;	
			// case 'Member':
			// case 'Set':
			// 	return true;
			default:
				return false;
				break;
		}
	}

	private isNum(v: string): boolean {
		const num = parseFloat(v);
		return !isNaN(num) && isFinite(num);
	}

	private FormatChangeHandler() {
		if (this.i.fmt.value === 'Member') {
			this.LoadMemberAndSetFields();
		} else if (this.i.fmt.value === 'Set') {
			this.LoadMemberAndSetFields('Set');
		} else {
			this.UnloadMemberAndSetFields();
		}
	}

	private RemovePossibleDelim(str: string): string {
		return str.replace(/[\t\n\f|:]/g, '');
	}

	private setVIDName(vID: any, newName: string): void {
		if (vID && vID.name) {
			vID.name = newName;
		}
		// console.log(this.vList)
		console.log(this.qList)
	}
}

export class LOLEditor {
	// private LOL: RS1.LoL;
	private rList: RS1.rList;
	private container: HTMLDivElement;
	private select: HTMLSelectElement;
	private selected: string;
	private btnsContainer: HTMLDivElement;
	private editorComponent: any | null; // New property to store the editor component instance
	private buttons: { Copy: HTMLButtonElement; Merge: HTMLButtonElement };

	// get CL(): RS1.vList | undefined {
	// 	return this.LoL.TovList();
	// }

	get CL(): RS1.qList | undefined {
		// return this.rList.TovList();
		return this.rList.toQList;
	}

	constructor(rList: RS1.rList, container: HTMLDivElement) {
		// this.LOL = LoL;
		this.rList = rList;
		this.container = container;

		this.select = this.container.ownerDocument.createElement('select');
		this.select.style.width = '250px';
		this.select.style.paddingLeft = '5px';
		this.select.style.borderRadius = '5px';
		this.select.setAttribute('size', '10');
		this.select.style.padding = '3px';
		this.select.setAttribute('multiple', '');

		this.selected = '';
		this.editorComponent = null; // Initialize the editor component instance

		this.btnsContainer = this.container.ownerDocument.createElement('div');
		this.btnsContainer.style.display = 'flex';
		this.btnsContainer.style.width = 'auto';
		this.btnsContainer.style.padding = '10px';
		this.btnsContainer.style.gap = '5px';
		this.btnsContainer.style.flexDirection = 'row';
		this.btnsContainer.style.alignItems = 'center';
		this.btnsContainer.style.justifyContent = 'center';
		this.container.appendChild(this.btnsContainer);

		this.buttons = {
			Copy: this.container.ownerDocument.createElement('button'),
			Merge: this.container.ownerDocument.createElement('button')
		};
	}

	// get LoL(): RS1.LoL {
	// 	return this.LOL;
	// }

	get RList(): RS1.rList {
		return this.rList;
	}

	public Reload(): void {
		this.Destroy();
		this.Populate();
	}

	public Destroy(): void {
		this.container.innerHTML = '';
	}

	public Populate(): void {
		this.LoadSelect();
	}

	private LoadSelect(): void {
		// this.LOL.ToSelect(this.select);
		this.rList.ToSelect(this.select);


		this.select.onchange = () => this.ListChangeHandler();

		this.container.append(this.select);

		this.LoadButtons();
	}

	private ListChangeHandler(): void {
		this.selected = this.select.value;
		this.LoadList();
	}

	private LoadButtons() {
		const buttonsArr = Object.entries(this.buttons);
		buttonsArr.forEach((btn) => {
			let button = btn[1];
			let text = btn[0];

			button.innerText = text;

			button.style.marginTop = '10px';
			button.style.width = '100px';
			button.style.height = '40px';
			button.style.borderRadius = '8px';
			button.style.fontFamily = 'inherit';
			button.style.background = 'black';
			button.style.outline = 'none';
			button.style.border = 'none';
			button.style.cursor = 'pointer';
			button.style.color = 'white';
			button.style.transition = '0.3s linear';

			// Add a hover effect
			button.addEventListener('mouseover', function () {
				button.style.background = 'lighten(#000000, 7%)';
			});

			button.addEventListener('mouseout', function () {
				button.style.background = 'black';
			});

			switch (text) {
				case 'Copy':
					button.onclick = () => this.CopyList();
					break;
				case 'Merge':
					button.onclick = () => this.MergeList();
					break;
			}

			this.btnsContainer.appendChild(button);
		});
	}

	// private CopyList(): void {
	// 	// @ts-ignore REASON: You've removed the copy function.
	// 	const newList: RS1.vList = this.LOL.ListByName(
	// 		this.select.value
	// 	)?.copy ();//  as RS1.vList;
	// 	this.LOL.add(newList.Str);
	// 	console.log(this.CL);
	// 	this.Reload();
	// }

	private CopyList(): void {
		// @ts-ignore REASON: You've removed the copy function.
		const newList: RS1.qList = this.rList.ListByName(
			this.select.value
		)?.copy ();//  as RS1.vList;
		this.rList.add(newList);
		console.log(this.CL);
		this.Reload();
	}


	private MergeList(): void {
		// const currentList = this.LOL.List(this.selected) as RS1.vList;
		const currentList = this.rList.qListByName(this.selected) as RS1.qList;

		const mergeWith: string = prompt(
			'Which list would you like to merge with? *(enter name, case sensitive)'
		) as string;
		// currentList.x.Merge(this.LOL.List(mergeWith));
		currentList.merge(this.rList.qListByName(mergeWith));
	}

	private LoadList(): void {
		// const list: RS1.vList = this.LOL.List(this.selected) as RS1.vList;
		const list: RS1.qList = this.rList.qListByName(this.selected) as RS1.qList;


		if (list.Name === this.selected) {
			if (this.editorComponent) {
				console.log('existing destroyed');
				this.DestroyComponent('.editor');
			}

			this.LoadEditorComponent(list as RS1.qList);
		} else return;
	}

	private DestroyComponent(query: string) {
		const component = this.container.querySelector(query);
		if (component) {
			component.remove();
			return;
		} else return;
	}

	// private LoadEditorComponent(list: RS1.vList) {
	// 	this.editorComponent = new Editor_TC({
	// 		target: this.container,
	// 		props: {
	// 			CLString: list.Str
	// 		}
	// 	});
	// }

	private LoadEditorComponent(list: RS1.qList) {
		this.editorComponent = new QEditor_TC({
			target: this.container,
			props: {
				// CLString: list.Str [modify]
				CLString: list.toStr
			}
		});
	}
}

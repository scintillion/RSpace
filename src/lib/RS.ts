// import { loadConfigFromFile } from "vite";
// import TextEditHandler from "../components/TileComponents/TextEditHandler.svelte";

export namespace RS1 {
	export const StrEndBlk='\x1f', StrEndBlkCode=0x1f, EndStr='\x1e', EndStrCode=0x1e;
	export const NILAB = new ArrayBuffer (0);

	const sleep=async (ms=1)=>await new Promise((r)=>setTimeout(r,ms));
	type StoreBuffer = string | ArrayBuffer | Function | undefined;

	export const SysPrefix='/';

	const DelimList='|\t\n\x0b\f\r\x0e\x0f\x10\x11\x12\x13\x14\x15';

	type RPArgs = string|number|RSD|string[]|number[]|RSD[];

	export const tNone='',tStr='$',tNum='#',tAB='(',tPack='&',tList='@',tData='^',tRSD='+',
		tDisk='*',tArray='[',tArrayStr=':[]:', tStrs='$[', tNums='#[', tRSDs='+[', RSDArrayCh='!';

	export class RP {
		type = '';
		cl = '';
		RSDName = '';
		KidName = '';
		dims = 0;
		arrType = '';
		bbiBytes = 0;
		D : RPArgs = 0;

		clear () {
			this.type = '';			
			this.cl = '';
			this.RSDName = '';	
			this.KidName = '';
			this.dims = 0;			
			this.arrType = '';	
			this.bbiBytes = 0;
			this.D = 0;
		}

		fromData (D : RPArgs, RSDName='', KidName='') {
			this.clear ();
			this.D = D;

			let t = typeof D;
			switch (t) {
				case 'string' :	this.type = tStr;	break;
				case 'number' :	this.type = tNum;	break;

				default :
					this.KidName = KidName; this.RSDName = RSDName;
					if (Array.isArray (D)) {
						if (D.length) {
							let elType = typeof D[0];
							switch (elType) {
								case 'string' : this.arrType = tStr; this.type = tStrs; break;
								case 'number' : this.arrType = tNum; this.type = tNums; break;
								default : this.arrType = tRSD; this.type = tRSDs; break;
							}
						}
						else { this.arrType = tRSD; this.type = tRSDs; }
					}
					else { this.type = tRSD; this.cl = (D as RSD).cl; 	}
					break;
			}
		}

		constructor (D : RPArgs, RSDName='', KidName='') {
			this.fromData (D, RSDName, KidName);
		}
	}

	export enum CLType {
		None,
		Std,
		Name,
		ID,
		Pack
	}

	export function padNumStr (num:number, len=3)
	{
		return String (num).padStart (len,' ');
	}

	export function SafeStr (str:string) {
		for (let i = DelimList.length; --i > 0; )
			str = str.replaceAll (DelimList[i],' ~');

		return str;
	}

	function prefixBytes (prefix : string) {
		if (!prefix) 
			return 0;

		let pos = 0;
		if (prefix[1] === '[') {
			if ((pos = prefix.indexOf (']')) < 0)
				return 0;
			if ((pos = prefix.indexOf (':',pos)) < 0)
				return 0;
		}
		else pos = prefix.indexOf (':');

		return (pos >= 0) ? Number (prefix.slice (pos + 1)) : 0;
	}

	export function strToStrings (S:string) {
		let D = S.slice(-1);
		if (D === '|')
			return [S];
		else if (!isDelim (D))
			return new Array<string> ();

		let Strs = S.split (D);
		return Strs.slice (0,-1);
	}

	type UBuf=Uint8Array;
	type ABI=UBuf|ArrayBuffer|string|undefined;
	type BBI=UBuf|undefined;
	type RSFldData=string|string[]|number|number[]|RSD|RSD[]|undefined;
	
	export class PB {	// prefix-buffer
		prefix='';
		bbi:BBI;
		Fields:RSF[]=[];
		RSDName='';
		FieldRSD='';
		DataRSD:RSD|undefined;

		fieldsToPB (Fields : RSF[]) {
			let RSDName = this.RSDName;
			let nBytes = 0, count = 0, first = RSDName + (this.FieldRSD ? (':' + this.FieldRSD) : '');
			let prefixes = [first];
		
			for (const F of Fields) {
				if (F) {
					prefixes.push (F.toPrefix (RSDName));
					++count;
		
					if (F._bbi)
						nBytes += F._bbi.byteLength;
				}
			}
			prefixes.push (StrEndBlk);


		
			let prefix = prefixes.join (',');

			console.log (prefixes.length.toString () + ' fieldsToPB='+prefix);

			let prefixBuf = str2bbi (prefix), buf = RS1.newBuf (nBytes + prefixBuf.byteLength),
					offset = prefixBuf.byteLength;
			buf.set (prefixBuf,0);
		
			prefixes = prefixes.slice (1,-1);
			
			let Bufs = Array<BBI> (count);
			let i = 0;
			for (const F of Fields) {
				if (F) {
					if ((F.type === tRSD)  &&  (F.Data))
						console.log ('  Field ' + (F.Data as RSD).Name + ' Type= ' + F.type + ' Prefix=' + F.prefix);
					else console.log ('  Field ' + F.Name + ' Type= ' + F.type + ' Prefix=' + F.prefix);


					let bbi = F._bbi; 
					Bufs[i++] = bbi;
					if (bbi  &&  bbi.byteLength) {
						buf.set (bbi, offset);
						offset += bbi.byteLength;
					}
				}
			}
		
			if (offset !== buf.byteLength)
				throw "Buf length mismatch!";
		
			this.Fields = Fields;
			this.prefix = prefix;
			this.bbi = buf;
		}
		
		bufToPB (Buf : UBuf) {
			let RSDName = this.RSDName, FieldRSD = this.FieldRSD, end = Buf.indexOf (StrEndBlkCode);
			if (end < 0)
				return [];
	
			let offset = end + 1, str = bb2str (Buf.slice (0,end));
			let prefix = str;

			let prefixes = prefix.split (',');

			console.log (prefixes.length.toString () + ' bufToPB='+prefix + '\n' + prefixes.join('\n')+'\n');

			let first = prefixes[0];
			prefixes = prefixes.slice (1,-1);
							
			let colon = first.indexOf (':');
			if (colon >= 0) {
				if (!RSDName)
					RSDName = first.slice (0,colon);
				if (!FieldRSD)
					FieldRSD = first.slice (colon + 1);
			}
			else if (!RSDName)
				RSDName = first;

			console.log ('RSDName=' + RSDName + ',FieldRSD=' + FieldRSD + 'Buf=' + bb2str (Buf));
	
			let count = prefixes.length, 
				Fields = Array<RSF> (count), i = 0;
	
			for (const P of prefixes) {
				let nBytes = prefixBytes (P), bbi, bbistr ='';
				if (nBytes) {
					bbi = Buf.slice (offset,offset + nBytes);
					offset += nBytes;
					bbistr = bb2str (bbi);
				}

				if (nBytes) 
					console.log ('  processing ' + nBytes.toString () + ' bytes, Buf Str=' +
						bbi?.byteLength.toString () + '=' + bb2str (bbi) + 'BBIStr=' + bbistr);

				let F = new RSF ();
				F.fromPrefix (P,bbi,FieldRSD);
				Fields[i++] = F;

				console.log ('Adding Field ' + F.expand)
			}
	
			this.Fields = Fields;
			this.bbi = Buf;
			this.prefix = prefix;
		}

		constructor (In : UBuf | RSF[], RSDName='', FieldRSD='') {
			this.RSDName = RSDName;
			this.FieldRSD = FieldRSD;

			if (Array.isArray (In))
				this.fieldsToPB (In as RSF[]);
			else this.bufToPB (In as UBuf)
		}
	}

	export class ParsedBuf {
		RSDName='';
		KidName='';
		PBs:PB[]=[];
		bbi:BBI;


	}

	export function newBuf (nBytes:number|ArrayBuffer) 
	{
		if (typeof nBytes === 'number')
			return new Uint8Array (nBytes as number);
		else return new Uint8Array (nBytes as ArrayBuffer);
	}

	export class BBInfo {
		prefix='';
		format='';
		RSDName='';
		bbi:BBI;
		start=0;
		nBytes=0;
		k:RSK|undefined;
	}

	type RSDT=RSD|undefined;
	type RSArgs=ABI|string[]|RSPack|RSDT|RSDT[]|RSField|ListTypes[]|undefined;


	export class BBPack {
		Prefixes : string[]=[];
		BBs : BBI[]=[];
		nBytes = 0;
		RSDName ='';
		KidName ='';
		bbi:BBI;

		get clear () {
			this.Prefixes = [];
			this.BBs = [];
			this.nBytes = 0;
			this.RSDName='';
			this.KidName='';

			return true;
		}

		add (Prefix : string, bbi : BBI) {
			this.Prefixes.push (Prefix);
			this.BBs.push (bbi);
			if (bbi)
				this.nBytes += bbi.byteLength;
		}

		get packBBI () {
			let first = ',';

			if (this.KidName)
				first = this.RSDName + ':' + this.KidName + ',';
			else if (this.RSDName)
				first = this.RSDName + ',';

			let prefixBB = str2bbi (first + this.Prefixes.join (',') + ',' + StrEndBlk), 
				offset = prefixBB.byteLength, totalBytes = this.nBytes + offset;

			let BB = newBuf (totalBytes);
			BB.set (prefixBB);
			for (const B of this.BBs) {
				if (B) {
					BB.set (B,offset);
					offset += B.byteLength;
				}
			}

			return this.bbi = BB;
		}

//			return this.prefix = this.type + arrStr + this.name + ':'+
//				(this.bbi ? this.bbi.length.toString () : '0');


		unpackBBI (bbi : BBI) {
			this.clear;
			if (!bbi)
				return;

			let prefix = bb2str (bbi.slice (0, bbi.indexOf (StrEndBlkCode))), offset = prefix.length + 1;
			let prefixes = prefix.split (','), first = prefixes[0], count = 0;
			prefixes = prefixes.slice (1,-1);

			for (const p of prefixes) {
				let nBytes = prefixBytes (p);
				this.Prefixes.push (p);
				let bb = bbi.slice (offset, nBytes);
				this.BBs.push (bb);
				offset += nBytes;
			}

		}
	}

	export class NameValue
	{
		Name : string;
		Value : string|RSD
		
		constructor (Name:string,Value:string|RSD) {
			this.Name = Name;
			this.Value = Value;
		}
	}	

	export class RSD {
		Mom? : RSD;
		_bbi? : BBI;
		protected qstr = '';

		get iList () { return true; }
		get notIList () { return false; }

		get isMom () { return false; }
		get cl () { return 'RSD'; }

		K?	:	RSK;
		Q?	:	qList;
		R?	:	rList;	

		N?	:	number[];
		P?	:	RSPack;
		S?	:	string[];
		T?	:	string;
		X?	:	RSD;
		Data? : any;

		copy (NewName = '') : RSD {
			let pb = this.toPB ();
			let newRS = newRSD (pb.bbi, this.cl);
			if (NewName)
				newRS.Name = NewName;
			return newRS;
		}
	
		get Name () { return this.qGet ('Name@'); }
		set Name (N:string) {
			this.qSet ('Name',N);
		}

		get Desc () { return this.qGet ('Desc@'); }
		set Desc (N:string) {
			this.qSet ('Desc',N);
		}

		get Group () { return this.qGet ('Group@'); }
		set Group (N:string) {
			this.qSet ('Group',N);
		}

		get Type () { return this.qGet ('Type@'); }
		set Type (N:string) {
			if (!this.Type)
				this.qSet ('Type',N);
		}

		get Sub () { return this.qGet ('Sub@'); }
		set Sub (N:string) {
			this.qSet ('Sub',N);
		}

		get Error () { return ''; }
		set Error (N:string) { this.qSet ('Error',N); }

		get clear () {
			this.qstr = '|';

			if (this.K)
				this.K.clear;
			
			if (this.Q)
				this.Q.clear;
			
			if (this.R)
				this.R.clear;
			
			if (this.N)
				this.N = [];
			if (this.P)
				this.P.clear;
			
			if (this.S)
				this.S = [];
			
			if (this.T)
				this.T = '';
			
			if (this.X)
				this.X.clear;
			
			if (this.Data)
				this.Data = NILAB;
			return true; 
		}

		get notZero () : boolean {
			if (this.qstr.length > 1)
				return true;
			let k = this.K;
			if (k) {
				if (k._kids.length)
					return true;
			}

			return this.Q || this.R || this.N ||  this.P  || this.S ||  this.T || this.X  ||  this.Data;
		}

		//	Info on RSD

		get qDescStr () {
			let Type = this.qDescByName ('Type');
			return this.listName + '[Type=' + Type + ']' + (this.qDesc? (':'+this.qDesc):''); 
		}

		get info () {
			let namestr = this.Name;

			let lines = namestr;
			if (this.Desc)
				lines += ':' + this.Desc;
				
			lines += '[' + this.cl;
				
			if (this.Type)
				lines += ' T=' + this.Type;
			if (this.Sub)
				lines += ' S=' + this.Sub;
			if (this.Group)
				lines += ' G=' + this.Group;

			lines += ']';
			return lines;
		}

		get expand () {
			let lines = this.info, count = 0, k = this.K;
			
			if (!k)
				return lines;
			
			for (const K of k._kids)
				if (K)
					lines += '\n    ' + padNumStr (++count) + '.' + K.info;

			return lines;
		}

		get toSafe () {
			return SafeStr (this.to$);
		}

		//	IN/OUT from RSD


		get to$$ () : string [] {
			let Strs:string[] = [], k = this.K;

			if (k) {
				for (const kid of k._kids)
					if (kid)
						Strs.push (kid.to$);
			}
			
			return Strs;
		}

		get to$ () {
			let s, iStr='', qStr='', rStr='', zStr='', kStr='', tStr = '', sStr = '', k = this.K;

			if (this.cl === 'qList')
				return this.qstr;

			iStr = this.qstr + 'I' + EndStr;

			if (s = this.Q)
				qStr = s.to$ + 'Q' + EndStr;

			if (s = this.R)
				rStr = s.to$ + 'R' + EndStr;

			if (s = this.S) {
				let Strs = this.S;
				sStr = Strs.join ('S' + EndStr) + 'S' + EndStr;
			}

			if (this.T)
				tStr = this.T + 'T' + EndStr;

			if (k) {
				if (this instanceof xList) {
					let lastDelim = DelimList.slice (-1), newStr, newDelim, highDelim='|';
					
					let Kids = k._kids, Strs = [this.qstr];
					for (const Kid of Kids) {
						if (Kid) {
							newStr = Kid.to$;
							Strs.push (newStr);
							newDelim = newStr.slice (-1);
							if (newDelim > highDelim)
								highDelim = newDelim;
						}
					}

					if (Strs.length) 
						kStr = Strs.join ('K\x1e') + 'K\x1e';
				}
			}

			let Str = iStr + qStr + rStr + zStr + kStr + tStr + sStr;
			return Str;
		}

		from$ (S:string|string[]) : string|string[] {
			let last, str, type = typeof S, Splits, Strs, q, r;
			if (q = this.Q)
				q.clear;
			if (r = this.R)
				r.clear;
			this.S = undefined;
			this.T = undefined;
			this.qstr = '|';

			if (type === 'string') {
				str = S as string;
				if (!str)
					str = '|';

				// last = str.slice (-1);
				last = str[str. length-1];
				if (last === EndStr) 	// delim case
					Splits = str.split (EndStr).slice (0,-1);
				else if (last === '|') 		// simple case, qList
					return this.qstr = str;
				else if (last < ' ')
					Strs = str.split (last).slice (0,-1);
				else if (str.indexOf ('\n') >= 0)
					Strs = str.split ('\n');	// deal with special case no terminating '\n'
				else //	last >= ' ', not terminated by delim, must add to qstr
					Strs = [str + '|'];
			}
			else Strs = S as string[];

			let remain:string[] = [], first;
			if (Strs  &&	Strs.length) {
				if (first=Strs[0]) {
					if (first.slice (-1) === '|') {
						this.qstr = first;
						Strs = Strs.slice (1);
					}
					else if (first.indexOf ('|') >= 0) {
						this.qstr = first + '|';
						Strs = Strs.slice (1);
					}
				}
				else Strs = Strs.slice (1);

				let k = this.K;
				if (k) {
					k.clear;
					for (const S of Strs)
						if (S)
							k.add (newList (S),false);
				}
			}

			if (Splits) {
				for (const str of Splits) {
					if (!str)
						continue;


					let last = str[str.length-1], first = str.slice (0,-1);

					console.log('str.length:', str.length, 'str:', JSON.stringify(str));
					console.log('last:', JSON.stringify(last), 'first:', JSON.stringify(first));

					switch (last) {
						case 'I' :
							if (first.slice(-1) !== '|')
								first += '|';
							this.qstr = first;
							break;

						case 'Q' :
							if (q)
								q.from$ (first);
							break;

						case 'R' :
							if (r)
								r.from$ (first);
							break;

						case 'T' :
							if (this.T)
								this.T = first;
							break;

						case 'S' :
							if (this.S)
								this.S = first.split ('\n');
							break;

						default : remain.push (str);
					}
				}
			}
			return remain;
		}

		fromPB (pb : PB, RSDName='', KidName='') {
			let k = this.K;
			if (k)
				k.clear;

			for (const field of pb.Fields) {
				let name = field.Name;

				switch (name) {
					case '.$' : this.from$ (field.Data as string); break;
					case '.x' : this.X = field.Data as RSD; break;
					case '.p' : this.P = field.Data as RSPack; break;
					default : if (k  &&  name  &&  name[0] != '.')
						k.add (field.Data as RSD,false);
				}
			}

			this._bbi = pb.bbi;
		}

		protected toPB (RSDName = '', KidName ='') {
			let Str, bbi;
			
			Str = this.to$;
			
			let k = this.K, x = this.X, p = this.P;

			let cName = this.cl, fldPack = (cName === 'RSPack'), Fields:RSF[] = [], field;
			if (!RSDName)
				RSDName = cName;
			else if (cName === RSDName)
				RSDName = '';

			if (Str) {
				field = new RSF ();

				field.setData (Str);
				field.setName ('.$');
				Fields.push (field);

				let bbtest = str2bbi (Str);
				if (bbtest.byteLength !== Str.length)
					throw 'Mismatched length!!';
			}

			if (x) {
				field = new RSF ();

				field.setData (x);
				field.setName ('.x');
				Fields.push (field);
			}

			if (p) {
				field = new RSF ();

				field.setData (p,'RSPack');
				field.setName ('.p');
				Fields.push (field);
			}

			if (this.N) {	// number array!
					field = new RSF ();
					field.setData (this.N)
					Fields.push (field);
			}

			if (k  &&  !(this instanceof xList)) {	// xList directly puts includes kids in to$
				let Kids = k._kids;
				for (const Kid of Kids) {
					if (Kid) {
						if (fldPack)
							// need to duplicate the field, not copy it by reference
							Fields.push ((Kid as unknown) as RSF);
						else {
							if (!KidName)
								KidName = Kid.cl;

							field = new RSF ();
							field.setData (Kid, KidName);
							field.setName (Kid.Name);
							Fields.push (field);
						}
					}
				}
			}

			let newPB = new PB (Fields, RSDName, KidName);
			this._bbi = newPB.bbi;
			return newPB;
		}


		PBsToBuf (PBs:PB[],RSDName='') {
			let pStrs = new Array<string> (PBs.length + 1), count = 0, cName = this.cl;
			if (cName === RSDName)
				cName = '';
			// else if (RSDName = '')

			for (const pb of PBs) {


			}
		}
		get dirty () { 
			return this._bbi !== undefined;
		}

		get mark () {
			this._bbi = undefined;
			return true;
		}



		fromBuf (Buf : UBuf, RSDName='', KidName='') {
			let pb = new PB (Buf, RSDName, KidName), k = this.K;

			console.log ('FromBuf # Fields = ' + pb.Fields.length.toString ());
			for (const F of pb.Fields) {
				let name = F.name;

				switch (name) {
					case '.$' : 
						console.log ('from$, str = ' + typeof (F.Data) + ':' + (F.Data as string))
						this.from$ (F.Data as string); break;
					case '.x' : this.X = F.Data; break;
					case '.p' : this.fromPack (F.Data as RSPack); break;
					// case '.q' : this.Q = F.Data as RSI; break;
					// case '.r' : this.R = F.Data as RSr; break;
					default :	// child
						if (k)
							k.add (F.Data as RSD, false);
				}
			}
		}

		get toBBI () {
			if (this._bbi)
				return this._bbi;
			else {
				let newPB = this.toPB ();
				return this._bbi = newPB.bbi;
			}
		}



		toPrefix (RSDName='') {
			let k = this.K, bbi, prefix;
			if (!(bbi = this._bbi)) {
				let pb = this.toPB (RSDName);
				if (!pb  ||  !(bbi = pb.bbi))
					return '';
			}

			let cName = this.cl;
			if (cName  &&  (cName !== RSDName))
				cName = '[' + cName + ']';
			else cName = '';
			
			let str = tRSD + cName + this.Name + ':' + bbi.length.toString ();
			console.log ('RSD.toPrefix=' + str);
			return str;
		}

		fromPack (Pack:RSPack) {}
		fromFields (Fields : RSF[]) {}











		constructRSD (In:RSArgs, clear = true) {
			if (clear)
				this.clear;

			if (!In)
				return;

			let t = typeof In;
			switch (t) {
				case 'string' : this.from$ (In as string); return;
				case 'number' :	return;
				case 'object' :
					if (Array.isArray (In)) {
						let Arr = In as Array<any>;
						if (!Arr.length)
							return;
						let elType = typeof (Arr[0]);

						switch (elType) {
							case 'string' : 
								this.rConstruct (In); return;
								//this.from$ (In as string[]); return;
							default :
								if (Arr[0] instanceof RSField) {
									this.fromFields (Arr as RSF[]); return; }
						}
					}
					else if (In instanceof Uint8Array) {
						console.log ('ConstructRSD on server, bytes = ' +
							(In as Uint8Array).byteLength.toString ());
						this.fromBuf (In);
					}
					else if (In instanceof ArrayBuffer)
						this.fromBuf (newBuf (In as ArrayBuffer));
					else
						log ('Illegal input to RSD construct!=' + In.constructor.name);
					break;
			}
		}

		constructor (In:RSArgs=undefined, name1='', type1='') {
			if (In) 
				this.constructRSD (In);
			if (name1)
				this.Name = name1;
			if (type1)
				this.Type = type1;
		}



		//	qList (intrinsic) functions

		qGet (s:string) {
			return this.qDescByName (s);
		}

		qSetNameValues (nv :(string|number|undefined)[]=[]) {
			this.mark;
			let i = 0, name = 0, NVs : string[] = Array ((nv.length+1) >> 1);
			for (const v of nv) {
				if (++name & 1) 	// name
					NVs[i] = v ? v.toString () : '';
				else {	// desc
					if (v)
						NVs[i++] += ':' + v.toString ();
					else ++i;
				}
			}

			NVs.length = NVs[i] ? i + 1 : i;
			let newValStr = '|' + NVs.join('|') + '|', firstDelim = this.qstr.indexOf ('|');
			this.qstr = (firstDelim >= 0) ? this.qstr.slice (0,firstDelim) + newValStr : newValStr;
		}

		qSetFastValues (ValueStr='') {
			this.mark;
			let firstDelim = this.qstr.indexOf ('|');
			if (ValueStr.slice (-1) !== '|')
				ValueStr += '|';
			if (ValueStr[0]	!== '|')
				ValueStr = '|' + ValueStr;
			if (firstDelim >= 0)	// if no first Delim, NOT a legal qStr, probably rList, abort
				this.qstr = this.qstr.slice (0,firstDelim) + ValueStr;
		}

		qGetStr (s:string) { return this.qGet (s); }

		qGetNum (s:string) { return Number (this.qGet (s)); }

		qSetStr (name:string,val:string) { this.qSet (name,val); }

		get qGetQStr () { return this.qstr; }
		qSetQStr (str = '|') { this.mark; this.qstr = str; }

		qMerge (add1 : qList|string, overlay=false) {
			if (this.notIList)
				return;

			this.mark;

			let addend = ((typeof add1) === 'string') ? newList (add1 as string) : add1;
			let cl = addend.cl;

			let add = addend.qSplitNames, notFound = true;

			for (const a of add.a)
				if (this.qFindName (a) >= 0) {
					notFound = false;
					break;
				}

			if (notFound) {
				let str = addend.to$;
				str = str.slice (str.indexOf ('|'));
				this.qstr += str.slice (str.indexOf ('|'));
				return;	// fast merge!
			}

			let dest = this.qSplitNames;
			for (let lim = add.a.length, i = 0; i < lim;++i) {
				let j = dest.a.indexOf (add.a[i]);
				if (j >= 0) 	// need to replace
					dest.b[j] = add.b[i];
				else {
					dest.a.push (add.a[i]);
					dest.b.push (add.b[i]);
				}
			}

			this.qFromRaw (dest.b);
		}


		//	****   xList functions		****

		get delim() {
			let k = this.K;
			if (!k)
				return '|'

			let high = '|', Kids = k._kids;

			for (const L of Kids)
				if (L) {
					let i = (L as xList).delim;
					if (i > high)
						high = i;
					else if ((i < high)  &&  (high === '|'))
						high = i;
				}

			// If _kids is empty, high=-1, returns DelimList[0]='\t'
			return DelimList[DelimList.indexOf (high)+1];
		}


		get firstDelim () {
			if (this.isMom)
				{ throw 'NO firstDelim in rList!'; return -1; }
			return this.qstr.indexOf('|');
		}

		get indent () {
			let I = new Indent (this.qstr.slice (0,99));
			return I.toABS;
		}

		protected getNameDesc (start=0) {
			let str = this.namedescstr (start);
			return new strPair (str);
		}

		protected setNameDesc (name:string,desc='') {
			this.mark;
			if (desc===name)
				desc = '';

			let str = (desc ? (name + ':' + desc) : name).padStart (this.indent,' '), D = this.delim;
			if (D === '|')
				this.qstr = str + this.qstr.slice (this.qstr.indexOf ('|'));
			else this.qstr = str;
		}

		namedesc (start=0) {
			let str = this.namedescstr (start);
			return strPair.namedesc(str);
		}

		get qName () {
			let str = this.namedesc ().a.trim ();
			return str;
		}
		set qName (s:string) { this.mark; this.setNameOrDesc (s); }

		get qDesc () {
			let pair = this.namedesc ();
			return pair.b ? pair.b : pair.a.trim ();
		}
		set qDesc (s:string) { this.mark; this.setNameOrDesc (s,true); }

		getNFD (start=0) {
			return new NFD (this.namedescstr (start));
		}

		setNameOrDesc (name='',ifDesc=false) {
			let pair = this.getNameDesc ();
			if (ifDesc) {
				pair.b = name;
			}
			else pair.a = name;

			this.mark;
			this.setNameDesc (pair.a, pair.b);
		}

		get listName() {
			let N = this.namedesc().a;
			let ind = new Indent (N);
			return N.slice (ind.to$.length);
		}

		protected namedescstr (start=0) {
			if (this.isMom)
				return this.qstr;

			let end = this.qstr.indexOf (this.delim,start);
			let str = end >= 0 ? this.qstr.slice (start, end) : this.qstr.slice (start);
			return str;
		}


		//
		// qList / FLAT functions
		//

		qSetFast (Args:any[]) {
			this.mark;
			let str = '|', len = Args.length;
			if (len & 1)
				throw 'setFast requires Name:Value pairs';

			for (let i = 0; i < len; i+=2) {
				let A0 = Args[i], A1 = Args[i+1];
				str += A0.toString () + ':' + A1.toString () + '|';
			}
			this.qMerge (str);
		}

		qNewRef (name='') {
			return new qList (name+':'+'@'+this.listName);
		}

		qBubble (name:string|number, dir=0) {
			this.mark;
			let start = this.qFindName (name);
			if (start < 0)
				return false;

			let end = this.qstr.indexOf('|',start+1);
			let str = this.qstr.slice (start);
			if (end < 0)
				return false;
			if (dir > 0) {	// bubble down, find next end
				end = this.qstr.indexOf('|',end+1);
				if (end < 0)
					return false;
			} else {		// bubble up
				let i = start - 1;
				while (--i >= 0) {
					if (this.qstr[i] === '|')	{	// found new start(-1)
						start = i + 1;
						break;
					}
				}

				if (i < 0)
					return false;	// at beginning, cannot bubble up
			}

			let flipstr = this.qstr.slice (start,end);
			let dPos = flipstr.indexOf ('|');
			if (dPos < 0)
				return false;

			flipstr = flipstr.slice (dPos+1) + '|' + flipstr.slice (0,dPos);
			this.qstr = this.qstr.slice (0,start) + flipstr + this.qstr.slice (end);
			return true;
		}

		get qCount () {
			let str = this.qstr, i = str.length, count = 0;
			while (--i >= 0)
				if (str[i] === '|')
					++count;

			return (count <= 1) ? 0 : count - 1;
		}

		qNum (name:string|number) {
			return Number (this.qDescByName (name));
		}

		qFindName (name:string|number) {
			let str = '|' + name.toString ()+':';
			let nPos = this.qstr.indexOf (str);
			if (nPos >= 0)
				return nPos+1;

			str = str.slice (0,-1) + '|';
			nPos = this.qstr.indexOf (str);
			return nPos >= 0 ? nPos + 1 : -1;
		}

		qFindByDesc(Desc: string|number) {
			let SearchStr = ':' + Desc.toString() + '|';

			let Pos = this.qstr.indexOf(SearchStr, this.qstr.indexOf('|'));
			if (Pos >= 0) {
				for (let i = Pos; --i > 0; ) {
					if (this.qstr[i] === '|')
						return i+1;
					}
				}

			// look for naked name matching
			SearchStr = '|' + Desc.toString () + '|';
			return this.qstr.indexOf(SearchStr);
		}

		qNameByDesc(desc: string|number) {
			let Pos = this.qFindByDesc (desc);
			if (Pos >= 0)
				return this.qstr.slice (Pos,this.qstr.indexOf(':',Pos));
			return '';
		}


		protected qPrePost (name:string|number) {
			let nPos = this.qFindName (name);
			if (nPos >= 0) {
				let dPos = this.qstr.indexOf ('|',nPos);
				if (dPos >= 0)
					return new strPair (this.qstr.slice (0,nPos),this.qstr.slice (dPos));
			}

			return new strPair ('','');
		}

		qDel (name:string|number) {
			this.mark;
			let pair = this.qPrePost (name);
			if (pair.a)
				this.qstr = pair.a + pair.b;
		}

		qSet (name:string|number,desc:string|number='') {
			this.mark;
			let vStr = desc ? (name.toString () + ':' + desc.toString ()) : name.toString ();
			let pair = this.qPrePost(name);

			if (pair.a)
				this.qstr = pair.a + vStr + pair.b;
			else this.qstr += vStr + '|';
		}


		get qToVIDs () {
			let Strs = this.qToRaw;
			let VIDs = new Array<vID> (Strs.length);

			let count = 0;
			for (const S of Strs) {
				VIDs[count++] = new vID (S);
			}
			return VIDs;
		}

		static qVIDsToLines(VIDs: vID[], Delim: string): string[] {
			let i = VIDs.length;
			let Lines: string[] = new Array(i);

			while (--i >= 0) Lines[i] = VIDs[i].ToLine(Delim);

			return Lines;
		}

//		get qToVList () {
//			return new vList (this.qstr);
//		}

		qToVIDList (Sep=';',Delim='') {
			if (!Delim)
				Delim = ':';

			let VIDs = this.qToVIDs, Str = '';

			for (const v of VIDs)
				Str += v.Name + Delim + v.Desc + Sep;

			return Str.slice (0,-1);
		}

//		qFromVList (L : vList) {
//			this.from$ (L.x.toStr);
//		}

		qGetVID (name:string|number) {
			let nPos = this.qFindName (name);
			if (nPos < 0)
				return undefined;

			let endPos = this.qstr.indexOf('|',nPos);
			if (endPos >= 0)
				return new vID (this.qstr.slice (nPos,endPos));

			return undefined;
		}

		qGetVIDFmt (name:string|number) {
			let VID = this.qGetVID (name);
			if (VID  &&  !VID.Fmt) 
				VID.Fmt = new IFmt ('');
			return VID;
		}

		qSetVID (VID:vID) {
			this.mark;
			let str = VID.to$, pos = str.indexOf(':');
			if (str) {
				if (pos < 0) // no desc
					this.qSet (str);
				else this.qSet (str.slice (0,pos),str.slice (pos+1));
			}
		}

		qExtract (xq : xList|string) {
			let x;
			if (typeof xq === 'string')
				x = (xq as string).split ('|');
			else {
				let split = (xq as xList).qSplitNames;
				x = split.a;
			}

			let split = this.qSplitNames, count = 0, newRaw = [];
			for (const s of x) {
				if (s) {
					let i = split.a.indexOf (s);
					if (i >= 0) {
						newRaw.push (split.b[i]);
						++count;
					}
				}
			}

			return count ? new qList (newRaw) : new qList ();
		}

		qToSelect(Select: HTMLSelectElement | HTMLOListElement | HTMLUListElement) {
			let VIDs = this.qToVIDs;
			let VIDLen = VIDs.length;

			if (Select instanceof HTMLSelectElement) {
				Select.options.length = 0;
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToSelect(Select);
			} else if (Select instanceof HTMLOListElement || Select instanceof HTMLUListElement) {
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToList(Select);
			}
		}

		get qRawByNames ()
		{
			let Strs = this.qstr.split('|');

			Strs = Strs.slice (1,-1);
			Strs.sort ();
			return Strs;
		}

		get qRawByDesc ()
		{
			let Strs = this.qstr.split('|');
			let desc='';
			Strs = Strs.slice (1,-1);
			for (let S of Strs) {
				let Pos = S.indexOf(':');
				if (Pos >= 0) {
					desc=S.slice (Pos+1);
					if (!desc)
						desc = S.slice (0,Pos);
				}
				else desc = S;

				S = desc + '\t' + S;
			}
			Strs.sort ();
			for (let S of Strs)
				S = S.slice (S.indexOf('\t') + 1);
			return Strs;
		}

		get qToSortedVIDs ()
		{
			let Strs = this.qRawByDesc;
			let lim = Strs.length, VIDs = Array<vID> (lim);

			while (--lim >= 0)
				VIDs[lim] = new vID (Strs[lim]);

			return VIDs;
		}

		static qSortVIDs(VIDs: vID[]) {
			let limit = VIDs.length;
			var Temp: vID;

			for (let i = 0; ++i < limit; ) {
				for (let j = i; --j >= 0; ) {
					if (VIDs[j].Desc > VIDs[j + 1].Desc) {
						Temp = VIDs[j];
						VIDs[j] = VIDs[j + 1];
						VIDs[j + 1] = Temp;
					} else break;
				}
			}
		}

		qDescByName (name:string|number) {
			let nPos = this.qFindName (name);
			if (nPos < 0)
				return '';

			let endPos = this.qstr.indexOf ('|',nPos);
			if (endPos < 0)
				return '';

			let str = this.qstr.slice (nPos,endPos);
			let dPos = str.indexOf(':');
			return (dPos >= 0) ? str.slice (dPos + 1) : str;
		}

		get qToRaw () : string[] {
			let Strs = this.qstr.split ('|');
			return Strs.slice (1,-1);
		}

		qFromRaw (VIDStrs:string[]=[]) {
			this.mark;
			let NameDesc = this.qstr.slice (0,this.qstr.indexOf('|')+1);
			let VIDStr = VIDStrs.join ('|');
			this.qstr = NameDesc + (VIDStr ? (VIDStr + '|') : '');
		}

		get qSplitNames () : strsPair {
			let raw = this.qToRaw, names=new Array<string> (raw.length),count=0;

			for (const s of raw) {
				let dPos = s.indexOf(':');
				names[count++] = (dPos >= 0) ? s.slice (0,dPos) : s;
			}

			return new strsPair (names,raw);
		}

		get qNames () { return this.qSplitNames.a; }





		// **** Kid functions (general, excluding rList) ****

		get kidTree () : RSTree|undefined {
			this.mark;
			let k = this.K;
			if (!k)
				return;

			if (!k._tree)
				k._tree = new RSTree (this);

			return k._tree;
		}

		get kidsInfo () {
			let lines = this.info + '\n   ' + this.toSafe.slice(0,75); 

			let n = 0, K = this.K;
			if (K) {
				let Items = K._kids;
				for (const L of Items)
					if (L)
						lines += '\n' + ''.padStart (this.indent,' ') + 'child#' + (++n).toString () + '==' + L.info;
			}

			return lines;
		}

		get kidsClear () {
			this.mark;
			let k = this.K
			return k ? k.clear : false;
		}

		kidDel (list:string|RSD) {
			this.mark;
			let K = this.K;
			if (K)
				return K.del (list as string|RSD);
			return false;
		}

		kidSet (kid1:RSD|RSD[],replace=true) {
			this.mark;
			let K = this.K;
			if (K)
				return K.Set (kid1,replace);
			return false;
		}

		kidAdd (kid1:RSD|RSD[]) {
			this.mark;
			return this.kidSet (kid1, false);
		}

		kidGet (name:string) { 
			let K = this.K;
			return K ? K.Get (name) : undefined;
		}

		get Kids () : RSD[] {
			let K = this.K;
			return K ? K.Kids : [];
		}

		kidCount (shallow = true) {
			let K = this.K, count = 0;
			if (K) {
				if (shallow)
					return K.nItems;

				let Kids = K.Kids;

				for (const kid of Kids)
					if (kid)
						count += kid.kidCount (false);
			}

			return count;
		}

		get kidNameValues () : NameValue[] {
			let K = this.K;
			return K ? K.NameValues : [];
		}

		//	rList functions

		listByName (name:string) {
			if (this.K)
				return this.K.Get (name);
		}

		qListByName (name:string) {
			let L = this.listByName (name);
			if (L  &&  (L.cl === 'qList')) 
				return L as qList;
		} 

		rListByName (name:string) {
			let L = this.listByName (name);
			if (L  &&  (L.cl === 'rList')) 
				return L as rList;
		} 

		get rtoQList () {
			let qstrs: string[] = [''], k = this.K;

			if (!k)
				return new qList ();

			let Lists = k._kids;

			for (const L of Lists) {
					if (!L) continue;

					let D = L.Desc, N = L.Name;
					qstrs.push ((D && (D != N)) ? (N + ':' + D) : N);
				}

			qstrs = qstrs.sort();

			return new qList(qstrs.join('|') + '|');
		}		

		rMergeList (list : xList|rList|RSR|string, overlay=true) {
			this.mark;
			let rsi, rsr, rsd, cl, merged = false;

			if (typeof list === 'string')
				list = newList (list);
			else cl = (rsd = list as RSD).cl;

			if (cl === 'qList') {
				rsi = list as qList;
				overlay = false;
			}
			else rsr = (cl === 'rList') ? list as rList : (list as RSR).R as rList;

			if (rsi) {
				let name = rsi.Name;
				let target = this.kidGet (name);
				if (target) {	// merge rsi with name matched RSI (kid)
					if (target.cl === 'qList') {
						console.log ('qList merge target = ' + (target as qList).expand);
						console.log ('qList merge incoming = ' + rsi.expand);
						(target as qList).qMerge (rsi);
						console.log ('qList target after merge = ' + (target as qList).expand);
						return true
					}	
				}
				else {
					this.kidAdd (new qList (rsi.to$));	// add new rsi as kid
					return true;
				}
			}
			else if (rsr) {
				if (overlay) {
					let rsrNV = rsr.kidNameValues,tlist;
					for (const nv of rsrNV) {						
						tlist = this.kidGet (nv.Name);
						if (tlist) {
							if (tlist.cl == 'rList') {
								(tlist as rList).rMergeList (nv.Value as rList);
								merged = true;
							}
							else if (tlist.cl === 'qList') {
								(tlist as qList).qMerge (nv.Value as qList);
								merged = true;
							}	
						}
						else {	// not found, must add this list
							this.kidAdd (newList ((nv.Value as xList).to$));
							merged = true;
						}
					}
				}
				else {
					let name = rsr.Name, target = this.kidGet (name);
					if (target && target.isMom) {	// merge rsr with name matched RSr (kid)
						(target as rList).rMergeList (rsr);
						return true;
					}
				}
			}

			return merged;
		}

		rReplaceList (list : xList|rList|RSR|string, single = true) {
			this.mark;
			let i=-1, xL:xList, replaced = 0;
			
			if (typeof list === 'string') 
				xL = newList (list);
			else {
				xL = list as xList;
				if (list.cl === 'RSR') {
					if ((list as RSR).R)
						xL = (list as RSR).R as xList;
				}
			}

			let name = xL.Name, k = this.K;
			if (!k)
				return 0;

			if (single) {
				i = k._names.indexOf (name);
				if (i >= 0) {
					k._kids[i] = newList (xL.to$);
					return 1;
				}
				return 0;
			}

			while ((i = k._names.indexOf (name,i+1)) >= 0) {
				k._kids[i] = newList (xL.to$);
				++replaced;
			}

			return replaced;
		}

		rBubbleKid (nameOrList:string|RSD,dir=0) {
			this.mark;
			let k = this.K;
			if (k)
				return k.bubble (nameOrList as string|RSD,dir);
			return false;
		}

		rConstruct (Str:RSArgs='',name='',desc='') {
			if (!Str)
				return;	

			this.mark;
			if (desc === name)
				desc = '';
			let ND = desc ? (name + ':' + desc) : name;

			this.qstr = ND;		// default value of qstr, could be modified later...

			this.mark;

			let Strs:string[]=[], aType = '', array1;
			aType = typeof Str;

			if (aType === 'object') {
				if (array1 = Array.isArray (Str)) {
					
					let e = Str[0], eType = typeof e;
					if (eType === 'string')
						aType = 'string[]';
					else if (e instanceof xList)
						aType = 'List[]';
					else aType = 'RSD[]'; 
				}
				else aType = Str.constructor.name;
			}

			switch (aType) {
				case 'string' :
					array1 = true;
					Strs = strToStrings (Str as string);
					break;
				case 'string[]' :
					array1 = true;
					Strs = Str as string[];
					break;
				case 'List[]' :
					if (this.K) {
						this.K.Set (Str as RSD[],false);
						console.log ('rList ' + this.qstr + ' created: ' + this.info);
					}
					return;
				default : Strs = [];
			}

			if (!Strs.length) {
				console.log ('rList ' + this.qstr + ' created: ' + this.info);
				return;
			}

			let first = Strs[0];
			if (isDelim (first.slice(-1))) {
				this.rAddList (Strs);
				console.log ('rList ' + this.qstr + ' created: ' + this.info);
				return;
			}

			if (!ND) {	// use first string as name:desc
					let pair = new strPair ();
					pair.fromStr (first,':');
					if (pair.b === pair.a)
						pair.b = '';
					if (pair.b)
						ND = pair.a + ':' + pair.b;
					else ND = pair.a;
					this.qstr = ND;
				}
			if (ND)
				console.log ('  ND=' + ND + '.');
			this.rAddList (Strs.slice(1));	//	need to call newLists[Symbol]..
			// console.log ('rList ' + this.qstr + ' created: ' + this.info);
		}

		rAddList (Str:string|string[]|xList) : qList|rList|undefined {
			this.mark;
			let k, list;
			if (!(k = this.K))
				return undefined;

			if ((typeof Str) === 'string') {
				let S = Str as string, D = S.slice (-1);

				list = (D === '|') ? new qList (S) : new rList (S);
				k.Set (list, false);
				return list;
			}
			else if (!Array.isArray (Str)) {	// non Array List
				k.Set (list = Str as xList);
				return Str;
			}

			let Strs = Str as string[];
			let L = undefined;
			for (const S of Strs) {
				if (!S)
					continue;

				let D = S.slice(-1);
				if (D === '|') {
					k.Set (new qList (S),false);
				}
				else if (isDelim (D)) {
					let LStrs = S.split (D);
					if (LStrs.length) {
						LStrs.length = LStrs.length - 1;
						let L = new rList (LStrs);
						if (L)
							k.Set (L,false);
					}
				}
			}

			return L;
		}
	}

	export const NILRSD = new RSD ();

	export class RSDCmd {
		NumberStr = '';
		SessionID = 0;
		SessionStr='';
		SerialID = 0;
		SerialIDStr = '';
		cmdstr = '';
		command = '';
		cmdXtra = '';
		commands : string[] = [];

		constructor (rsd : RSD, serving = true) {
			let serial = this.NumberStr = rsd.qGet ('#');
			let colon = serial.indexOf (':');

			if (this.NumberStr) {
				if (colon >= 0) {
					this.SessionID = Number (this.SessionStr = serial.slice (colon + 1));
					this.SerialID = Number (this.SerialIDStr = serial.slice (0,colon));
				}
				else this.SerialID = Number (this.SerialIDStr = serial);
			}

			let cmdstr = this.cmdstr = rsd.qGet (serving ? '?' : '.'), commands:string[] = [];
			if (cmdstr) {
				commands = cmdstr.split (':');
				this.command = commands[0];
				this.cmdXtra = commands[1];
				commands = commands.slice (1);
			}

			console.log ('RSDcmd RSD=' + rsd.to$ + '\n Receives Message #' + this.SerialIDStr + '/' + this.SerialID.toString () +
			' Session=' + this.SessionStr + '/' + this.SessionID.toString () +
		 		'\n  CmdStr = ' + this.cmdstr + ' CmdXtra = ' + this.cmdXtra + ' NumberStr =' + this.NumberStr);
		}
	}

	export function newRSD (x:RSArgs=undefined,name='') : RSD {
		let R = undefined;

		if (!name) {
			if (x) {
				let cName = x.constructor.name;

				if (cName === 'Uint8Array') {
					let bbi = x as Uint8Array, str = bb2str (bbi.slice (0,99)), comma = str.indexOf (',');
					if (comma >= 0) {
						let nameStr = str.slice (0,comma), colon = nameStr.indexOf (':');
						name = (colon >= 0) ? nameStr.slice (0,colon) : nameStr;
					}
					else throw 'Bad Buffer, no comma!'
				}
			}
		}

		switch (name) {
			case 'RSD' : return new RSD (x);
			case 'xList' : return new xList (x);
			case 'qList' : return new qList (x);
			case 'RSLeaf' : return new RSLeaf (x as RSD);
			case 'RSTree' : return new RSTree (x as RSD);
			case 'RSr' : return new rList (x  as string|string[]|ListTypes[]);
			case 'RSR' : return new RSR (x);
			case 'Bead' : return new Bead (x);
			case 'rList' : return new rList (x as string|string[]|ListTypes[]);
			case 'rLOL' : return new rLOL (x as string|string[]|ListTypes[]);
			case 'TDE' : return new TDE (x as string|rList);
			// case 'PackField' : return new PackField (x,);
			// case 'RSField' : return new RSField ();
			default : return new RSD (x);
		}
	}


	export class RSK {
		_names:string[]=[];
		_kids:RSDT[]=[];
		_tree:RSTree|undefined;
		_preFormat:string|undefined;
		_me : RSD;

		get cl () { return 'RSK'; }

		constructor (me : RSD) {
			this._me = me;
		}

		index (kid:string|RSD)	 {
			if (kid)
				return ((typeof kid) !== 'string') ? this._kids.indexOf (kid as RSD) :
						 this._names.indexOf (kid as string);

			return -1;
		}

		del (kid : RSD|string|number) {
			let i = ((typeof kid) === 'number') ? kid as number : this.index (kid as RSD|string);
			if (i >= 0) {
				this._names[i] = '';
				let Kid = this._kids[i];
				if (Kid)
					Kid.Mom = undefined;
				this._kids[i] = undefined;
				this.mark;
			}
			return i >= 0;
		}

		Get (kid:string|RSD|number) : RSDT {
			if ((typeof kid) === 'number')
				return this._kids[kid as number];

			let i = this.index (kid as string|RSD);
			return (i >= 0) ? this._kids[i] : undefined;
		}

		Set (kid1 : RSD|RSD[]|undefined, replace=false) {
			let Kids = this._kids, Names = this._names, changed = 0;
			let NewKids = (Array.isArray (kid1)) ? kid1 as RSD[] : [kid1 as RSD];

			for (const kid of NewKids) {
				let Name = kid.Name, i = replace ? Names.indexOf (Name) : Kids.indexOf (undefined);
				kid.Mom = this._me;
				if (i < 0) {
					Kids.push (kid);
					Names.push (Name);
				}
				else {
					Kids[i] = kid;
					Names[i] = Name;
				}
				++changed;
			}

			if (changed)
				this.mark;
		}

		add (kid1:RSD|RSD[], replace=false) { this.Set (kid1,replace); }

		get Kids () : RSD[] {
			let Kids = this._kids, lim = Kids.length, NewKids = Array<RSD> (lim), count = 0;

			for (const K of Kids) 
				if (K)
					NewKids[count++] = K;

			NewKids.length = count;
			return NewKids;
		}

		get nItems () {
			let Kids = this._kids, count = 0;

			for (const K of Kids)
				if (K)
					++count;

			return count;
		}

		get nFam () {
			let Kids = this._kids, count = 0;

			for (const K of Kids)
				if (K) {
					++count;
					let k = K.K;
					if (k)
						count += k.nFam;
				}

			return count;
		}

		get mark () { this._tree = undefined; return true; }

		get Tree () {
			return this._tree = new RSTree (this._me);
		}

		get clear () { 
			this._names = [];
			this._kids = [];
			return this.mark;
		}

		setKids (Kids : RSD[]) {
			this._kids = Kids;
			let i = 0, count = Kids.length;
			this._names = Array<string> (count);
			for (const K of Kids)
				this._names[i++] = K.Name;
		}

		bubble (nameOrList:string|RSD,dir=0) {
			if (!nameOrList)
				return false;

			let i = this.index (nameOrList);
			if (i < 0)
				return false;

			this.mark;

			let j = i;
			if (dir <= 0)	{	//	bubble up
				while (--j >= 0)
					if (this._kids[j])	// found a switch
						break;

				if (j < 0)
					return false;
			}
			else {	// bubble down
				let lim = this._kids.length;
				while (++j < lim)
					if (this._kids[j])	// found a switch
						break;

				if (j >= lim)
					return false;	// switch not found
			}

			this.mark;
			let OldName = this._names[i], OldKid= this._kids[i];
			this._names[i] = this._names[j]; this._kids[i] = this._kids[j];
			this._names[j] = OldName; this._kids[j] = OldKid;
			return true;
		}

		get NameValues () {
			let Kids = this._kids, NVs = Array<NameValue> (Kids.length), count = 0;

			for (const K of Kids) {
				if (K)
					NVs[count++] = new NameValue (K.Name, K);
			}

			NVs.length = count;
			return NVs;
		}


		get names () {
			let Kids = this._kids, Names = Array<string> (Kids.length), i = 0, count = 0;

			for (const K of Kids) {
				++i;
				if (K) {
					let N = K.Name;
					if (N)
						Names[count++] = N;
				}				
			}

			Names.length = count;
			return Names;
		}
	}

	export class RSMom extends RSD {
		K : RSK = new RSK (this);

		get isMom () { return true; }

		get cl () { return 'RSMom'; }
	}

	export class RSLeaf extends RSD {
		D : RSD;
		level = 0; prev=0; first=0; parent=0; next=0; count=0; fam=0; last = 0;

		get cl () { return 'RSLeaf'; }

		constructor (D:RSD,level=0) {
			super ();
			this.D = D;
			this.level = level;
		}

		get to$ () {
			let str = 'lev='+this.level.toString()+' prev='+this.prev.toString()+
				' next='+this.next.toString() + ' first=' + this.first.toString () + 
				' last='+this.last.toString() + 
				' parent='+this.parent.toString () + ' count=' + this.count.toString() +
				'/' + this.fam.toString () + ' D=' + this.D.info;

			return str;
		}
	}

	export class RSTree extends RSMom {
		get cl () { return 'RSTree'; }

		get Leafs () {
			let count = 0, Items:RSLeaf[]=[], k = this.K;
			if (!k)
				return Items;

			for (const K of k._kids)
				if (count++  &&  K)
					Items.push (K as RSLeaf);
			return Items;
		}

		constructor (D : RSD) {
			super ();
			this.addLeaf (D,0);
			this.links ();
		}

		addLeaf (D:RSD, level:number) {
			let K = this.K;
			if (!K)
				return;

			let L = new RSLeaf (D, level);
			if (!level) {
				this.clear;
				K._kids.push (undefined);	// add the 0 element - a dummy, not a true leaf
				K._names.push ('');	
			}

			K.Set (L, false);

			let dk = D.K;
			if (dk) {
				let Kids = dk._kids;
				++level;
				for (const Kid of Kids)
					if (Kid)
						this.addLeaf (Kid, level);
			}
		}

		private links () {
			// calculate relations   for the TDEs
			let K = this.K;
			if (!K)
				return;

			let Kids = K._kids, limit = Kids.length;

			for (let tnum = 0; ++tnum < limit; ) {
				let me = Kids[tnum] as RSLeaf;
				let mylev = me.level;
				let parentlev = mylev - 1;
				let childlev = mylev + 1;
				let lev;

				me.first = me.next = me.parent = me.prev = 0;

				for (let i = tnum; --i > 0; )
					if ((lev = (Kids[i] as RSLeaf).level) >= parentlev) {
						if (lev == parentlev) {
							me.parent = i;
							break;
						} else if (lev == mylev && !me.prev) me.prev = i;
					}

				for (let i = me.last = tnum; ++i < limit; )
					if ((lev = (Kids[i] as RSLeaf).level) >= mylev) {
						if (lev === mylev) {
							me.next = i;
							break;
						}
						me.last = i;
						if (lev == childlev && !me.first)
							me.first = i; // first child
					} else break;
			} // for each TDE/tile
		}
	}


	export class strPair {
		a:string;b:string;

		constructor (a1='',b1='') {
			this.a = a1; this.b = b1;
		}

		fromStr (str='',sep=':') {
			let pos = str.indexOf(sep);
			if (pos >= 0) {
				this.a = str.slice (0,pos);
				this.b = str.slice (pos+1);
			}
			else {
				this.a = str;
				this.b = '';
			}
		}	
		
		to$ (sep=':') :string {
			return this.a + sep + this.b;
		}

		static New (str='',sep=':') {
			let pair = new strPair ();
			pair.fromStr (str,sep);
			return pair;
		}		

		static namedesc (str:string) {
			return this.New (str);
		}
	}

	export class numPair {
		a:number;b:number;

		constructor (a:number,b:number) {
			this.a=a;
			this.b=b;
		}

		fromStr (str='',sep=',') {
			if (!str) {
				this.a = NaN;  this.b = NaN; return;
			}

			let pair = strPair.New (str,sep);
			this.a = Number (pair.a); this.b = Number (pair.b);
		}

		to$ (sep=',') {
			return this.a.toString () + sep + this.b.toString ();
		}

		static New (str='',sep=',') {
			let pair = new numPair(0,0);
			pair.fromStr (str,sep);
			return pair;
		}
	}

	export class NFD {	// name, format, desc strings
		name='';
		format='';
		desc='';

		fromStr (str='') {
			this.format = '';
			if (!str) {
				this.name='';
				this.desc='';
				return;
			}

			let pos = str.indexOf(':');
			if (pos < 0) {
				this.name = str;
				this.desc = '';
				return;
			}
			
			this.name = str.slice (0,pos);
			let post = str.slice (pos + 1);
			if (post[0] !== '[') {
				this.desc = post;
				return;
			}

			pos = post.indexOf(']');
			if (pos < 0) {
				this.format = post.slice (1);
				return;
			}

			this.format = post.slice (1,pos);
			this.desc = post.slice (pos + 1);
		}

		constructor (str='') { this.fromStr(str); }

		get to$ () {
			let str = this.name;
			if (this.format  ||  this.desc)
				str += ':';
			if (this.format)
				str += '[' + this.format + ']';
			return str + this.desc;
		}
	}

	export class strsPair {
		a:string[];b:string[];

		constructor (a:string[],b:string[]) {
			this.a=a;
			this.b=b;
		}
	}

	export class Indent {
		private num=0;
		private str='';

		set (value:string|number='') {
			if ((typeof value) === 'number') {
				let n = value as number;
				if (n > 0)
					this.str = ''.padStart (-n,' ');
				else if (!n) 
					this.str = '';
				else this.str = (-n).toString ();

				this.num = n;
				return;
			}

			let S = value as string;

			if (!S) {
				this.str = '';
				this.num = 0;
				return;
			}

			let len = S.length, i = 0;
			if (S[0] <= ' ') {
				while (((S[i]===' ')||(S[i]==='\t')) && (i < len))
					++i;

				if (i < len) {
					this.str = S.slice (0,i);
					this.num = i;
					return;
				}
				this.str = S;
				this.num = len;
				return;
			}

			while (((S[i]<='9')&&(S[i]>='0'))  &&  (i < len))
				++i;

			if (!i) {
				this.num = 0;
				this.str = '';
				return;
			}

			if (i < len) {
				this.str = S.slice (0,i);
				this.num = Number (this.str);
				return;
			}

			this.str = S;
			this.num = Number (S);
		}

		constructor (val:string|number='') { this.set (val); }

		get to$ () { return this.str; }
		get toNum () { return this.num; }
		get toMin$ () { return (this.num >= 0) ? this.str : (-this.num).toString (); }
		get toABS () { return (this.num >= 0) ? this.num : -this.num; }
		get toAB$ () { return ''.padStart (this.toABS,' '); }
	}

	var _editTile = 'S';

	export function setEditTile (T='S') { _editTile = T; myTile = T; }

	export function log (...args:string[]) {
		console.log (args);
		return args;
	}

	export var myServer='';
	export var mySession=0;		// this is the LAST session # on the server
	export var myTile='S';
	export var myVilla='S';

	type SpecArgs=string|BufPack|RSData;

	interface NewData { (P:BufPack) : RSData }

	interface PackFunc { (Pack : BufPack) : BufPack }
	interface PackToDataFunc { (P:BufPack,Type:string) : RSData }
	function NILPackFunc (P : BufPack) { return P; }

	interface ABReq { (AB : ArrayBuffer) : Promise<ArrayBuffer> }
	interface StrReq { (Query : string) : Promise<BufPack> }
	interface PackReq { (Pack : BufPack) : Promise<BufPack> }
	interface RSDReq { (RSD : RSD) : Promise<RSD> }	
	interface DataReq { (D : RSData) : Promise<RSData> }
	interface RIDReg { (R: RID) : undefined }

	export async function NILDataReq (D:RSData) : Promise<RSData>
		{ throw "NILDataReq"; return NILData; }
	export function NILNew () { throw 'NILNew'; return NILData; }

	export var _ReqAB : ABReq;
	var _ReqPack : PackReq;
	var _ReqRSD : RSDReq;

	export var _RegRID = '';

	const InitStr = 'InitReq must be called before Request Operations!';


	/*
      vID is a class representing a named value, which also had an ID related to its
      index (position) within an ordered list of like items.  vIDs are stored in
      vLists which are defined by a string in the format

      ListName|Element1Name:Desc e1|Element2Name: Description or value|...|ElementN:asdf|

      The last character in the vList string defines its Element Delimiter, in the
      case above, '|'.  The colon character ':' terminates the name (and cannot appear
      within the name), and each ElementNames may NOT start with a numeric character
      (0..9,-,+) since these are illegal in variable names.

      An element in the vList is starts and terminates with the Element Delimiter
      taking the format |ElementName:ElementDesc|.  Therefore, it is easy to search a
      vList for a particular Element by its name, in the form "|Element:".  The
      end of the Element is the last character before |.

      vLists can be used to maintain lists of defined constants for programmers, but
      conveniently provide a way to display those values to the user through their
      element names and descriptions.  (In such a case, their position in the list is
      fixed and provides the ID (index) value of the defined constant.  (See the ToDC
      function in the vID class).

      vLists and their defining string can also be used to provide configuration
      parameters for an object such as a Tile: e.g. |TileCfg|AL=UL|Color=Blue|Height=23|

      Because vLists and their vIDs are defined by strings, they can be used to
      pass data between machines or foreign tiles.  They can efficiently represent the
      data of diverse objects, e.g. user record
      "User|Name:Doe1234|FullName:John Doe:Email:scintillion@gmail.com|Value:123.96|Phone:16055551414|"

      Once passed to an object, a vList can be left AS IS, without deliberately
      parsing and expanding its data, because the individual elements are quickly
      accessed, each time as needed, using highly efficient string search.

      The vID for a list element returns the Name and Desc fields (strings),
      along with the ID (the index within the vList, which is fixed), and the
      Value field which is a number (if Desc is a number, Value will be set).

      A special case of a vList is a RefList, which is a list of indexes referring
      to a fully defined vList, with the form "vListName|1|5|23|" where the
      RefList includes elements #1, #5, #23 from the vList named "vListName".
      Note that if a vID is selected from the RefList, in this case, #2, it would
      select the second element in the list, whose name is "5".  Since there is no
      name terminator ':', we know this is a reflist element with no description field,
      but for consistency, we set the description field to match the name "5".  And the
      Value field for the vID is set to the numeric value of its name/descriptor = 5.

      By using a complete vList along with a RefList defining a subset of its
      elements, we can create lists of elements to display to the user.  The ToLine
      function of the vID creates such a line, with the Description in the first
      part of the line (readable by the user), and (if delimiter is provided), a
      second portion of the string defining the index/ID and the Name.

    */

	  export class IValue {
		_Str: string = '';
		Nums: number[] = [];
		Strs: string[] = [];
		Error: string = '';

		get Num(): number | undefined {
			return this.Nums && this.Nums.length === 1 ? this.Nums[0] : undefined;
		}
		get Str(): string | undefined {
			return this.Strs && this.Strs.length === 1 ? this.Strs[0] : undefined;
		}
	}
	type IValue0=IValue|undefined;

	export class IFmt {
		Type: number = 0;
		Ch = ''; // first char denoting type of format
		// Str='';
		Xtra='';
		Value: IValue = new IValue();
		Num = 0;
		List?: qList;
		Arr: number[] | undefined;

		/*  Input Formats, defined by [FormatStr]

            FormatStr starts with first character which defines its nature,
            followed by additional characters in some cases

            # - number (including floating point)
            I - integer
            Onn - ordinal integers, 0 allowed to indicate none (nn is limit if present)
            R - StartNumber  COMMA  EndNumber
            P - integer pair
            Ann - number array (COMMA separated)  (nn specifies size limit for array)
            {} - set of allowed strings inside brackets, choose one (or NONE)
            @ListName - choose member from named list
            $ - dollar amount, allows two digit cents included $$$.cc
            %nn - string limited to nn characters
            Unn - uppercase string




        */

		static create (Type : string|number,Xtra='',Value:string|number='') {
			let Fmt = new IFmt ('');
			Fmt.setType (Type);
			if (Xtra)
				Fmt.setXtra (Xtra);
			if (Value)
				Fmt.setValue (Value);
			return Fmt;
		}

		get TypeStr () { 
			let i = TypeArray.indexOf (this.Type);
			return (i >= 0) ? TypeNames[i] : '';
		}

		setXtra (Str1='') {
			switch (this.Type) {
				case FMMember:
					if (this.List = CL.List(Str1))
						this.Xtra = Str1 + ' = Bad List Name';
					break;

				case FMRange:
					if (Str1.indexOf(',')) {
						this.Arr = new Array(2);
						this.Arr[0] = Number(Str1);
						this.Arr[1] = Number(Str1.slice(Str1.indexOf(',') + 1));
					} else this.Xtra = Str1 + ' = Bad Range';
					break;

				case FMSet:
					if (Str1[Str1.length - 1] === '}')
						Str1 = Str1.slice(1, Str1.length - 1); // clip it from ends
					else Str1 = Str1.slice(1);

					this.Xtra = Str1 = ',' + Str1 + ','; // every member starts/ends with ,
					break;
/*
				case FMNum:		do nothing for these, can ignore
				case FMInt:
				case FMPair:
					break;
				case FMOrd:
				case FMNums:
				case FMStr:
				case FMUpper:
					break;
*/
			}

			this.Xtra = Str1;
		}

		setValue(Val:string|number='') {
			let vType = typeof (Val);
			let ValStr = (vType === 'string') ? 
				(Val as string) : (Val as number).toString ();

			this.Value._Str = ValStr;

			this.Value.Nums = [];
			this.Value.Strs = [];
			this.Value.Error = '';

			switch (this.Type) {
				case FMNum:
				case FMInt:
				case FMDollar:
				case FMRange:
				case FMOrd:
					let Num = Number(ValStr);
					if (Num || (Num === 0))
						this.Value.Nums.push(Num);
					else this.Value._Str = '';
					break; // single number

				case FMStrs:
					this.Value.Strs = ValStr.split(',');
					break;

				case FMPair:
				case FMNums:
					let Strs = ValStr.split(',');
					let limit = Strs.length;
					for (let i = 0; i < limit; ) this.Value.Nums.push(Number(Strs[i++]));
					break; // multiple numbers

				case FMStr:
				case FMUpper:
				case FMSet:
					this.Value.Strs.push(ValStr);
					break; //  string

				default:
					this.Value.Error = 'Invalid Type';
					break;
			}
		}

	ParseValue(ValStr: string = '') {
		if (ValStr) {
			this.Value._Str = ValStr;
		} else ValStr = this.Value._Str;

		this.Value.Nums = [];
		this.Value.Strs = [];
		this.Value.Error = '';

		switch (this.Type) {
			case FMNum:
			case FMInt:
			case FMDollar:
			case FMRange:
			case FMOrd:
				this.Value.Nums.push(Number(this.Value._Str));
				break; // single number

			case FMStrs:
				this.Value.Strs = this.Value._Str.split(',');
				break;

			case FMPair:
			case FMNums:
				let Strs = this.Value._Str.split(',');
				let limit = Strs.length;
				for (let i = 0; i < limit; ) this.Value.Nums.push(Number(Strs[i++]));
				break; // multiple numbers

			case FMStr:
			case FMUpper:
			case FMSet:
				this.Value.Strs.push(this.Value._Str);
				break; //  string

			default:
				this.Value.Error = 'Invalid Type';
				break;
		}
	}


	setType (Str : string|number) {
		let index = 0;
		let TypeNum = 0;

		if ((typeof Str) === 'number') {
			TypeNum = Str as number;
			index = TypeArray.indexOf (TypeNum);
			if (index >= 0) {
				this.Ch = TypeChars[index];
				return this.Type = TypeNum;
			}
			return 0;	// no luck, bad type number
		}

		// setting Type by String
		let Str1 = Str as string;
		if (!Str)
			return 0;

		if (Str1.length === 1) {
			index = TypeChars.indexOf (Str1);
			if (index >= 0)
			{
				this.Ch = Str1;
				return this.Type = TypeArray[index];
			}
			return 0;
		}

		// Named String...
		index = TypeNames.indexOf (Str1);
		if (index < 0)
			return 0;	// bad type name

		this.Ch = TypeChars[index];
		this.Type = TypeArray[index];			
		return this.Type;
	}

		constructor(Str1='') {
			let NoError = true;

			if (!Str1) {
				return;
			}

			if (Str1[0] === '[') {
				let EndPos = Str1.indexOf(']');
				if (EndPos >= 0) {
					Str1 = Str1.slice(1, EndPos);
				}
			}

			let ValPos = Str1.indexOf('=');
			let V;
			if (ValPos >= 0) {
				V = new IValue();
				V._Str = Str1.slice(ValPos + 1);
				this.Value = V;
				Str1 = Str1.slice(0, ValPos);
			}

			this.setType (Str1.slice (0,1).toUpperCase ());
			if (Str1.length > 1) {
				this.Xtra = Str1.slice(1);
				if (V) {
					if (isDigit(Str1[0])) this.Num = Number(this.Xtra);
				}
				this.setXtra (this.Xtra);
			} else this.Xtra = Str1 = '';

			this.setValue(this.Value._Str);
		}

		get to$() {
			if (this.Type)
			return (
				'[' + this.Ch + this.Xtra +
				(this.Value._Str ? '=' + this.Value._Str : '') +
				']'
			);

			return '';
		}
	}
	type IFmt0=IFmt|undefined;

	export class vID  {
        // often abbreviated as VID
        List?:qList;

		Values: number[] = [];
		Name='';
		Desc='';
		ID=0;
		Fmt?: IFmt;

		static fastVID (name='',desc='') {
			let v = new vID ('');
			v.Name = name;
			v.Desc = desc;
			return v;
		}

		constructor(Str: string='', List1?:qList) {
			if (!Str)
				return;

			let Desc1 = '', NameEnd = Str.indexOf(':');

			if (NameEnd >= 0) {
				this.Name = Str.slice(0, NameEnd);
				Desc1 = Str.slice(NameEnd + 1);
			} else	this.Name = Str;

			if (Desc1) {
				if (Desc1[0] === '[') {
					let FmtStr = FmtStrFromDesc(Desc1);
					if (FmtStr) {
						Desc1 = Desc1.slice(FmtStr.length + 2);
						this.Fmt = new IFmt(FmtStr);
					}
				}
			} else Desc1 = this.Name;

			this.Desc = Desc1;
			this.List = List1;

			if (isDigit(Desc1)) {
				if (Desc1.indexOf(',') < 0) {
					// single number
					this.Values.push(Number(Desc1));
				} else {
					// array of numbers, comma separated
					let Strs = Desc1.split(',');
					let limit = Strs.length;
					this.Values = [];

					for (let i = 0; i < limit; ) this.Values.push(Number(Strs[i++]));
				}
			}

			this.Desc = Desc1;
		}

		ToDC(Prefix: string): string {
			return Prefix + this.Name + '=' + this.ID.toString();
		}

		ToLine(Delim1: string = '') {
			if (Delim1) {
				return this.Desc + Delim1 + this.Name + ':' + this.ID.toString();
			} else return this.Desc;
		}

		get to$() {
			if (!this.Desc || this.Name === this.Desc) return this.Name;

			let RetStr = this.Name + ':';
			if (this.Fmt) RetStr += this.Fmt.to$;

			return RetStr + this.Desc;
		}

		get toValueStr() {
			if (this.Fmt) {
				let Val = this.Fmt.Value;
				if (Val) {
					if (Val.Num) return '=' + Val.Num.toString();
					if (Val.Nums) return '=' + Val.Nums.toString();
					if (Val.Str) return '=' + Val.Str;
					if (Val.Strs) return '=' + Val.Strs.toString();
				}
			}
			return '';
		}

		get toFmtStr() {
			let Fmt = this.Fmt;
			if (Fmt) {
				let VStr = '[' + Fmt.Ch;

				if (Fmt.Num) VStr += Fmt.Num.toString();

				return VStr + this.toValueStr + ']';
			}
			return '';
		}

		get toExtraStr() {
			return this.toFmtStr + this.Name + ':' + this.ID.toString();
		}

		ToSelect(Select: SelectArgs) {
			if (Select && Select instanceof HTMLSelectElement) {
				let Option: HTMLOptionElement = Select.ownerDocument.createElement(
					'option'
				) as HTMLOptionElement;

				let Desc = this.Desc ? this.Desc : this.Name;
				let Value = '';
				if (Desc[0] === '[') {
					let Pos = Desc.indexOf('=');
					if (Pos >= 0) {
						Value = Desc.slice(Pos + 1);
						let EndPos = Value.indexOf(']');
						if (EndPos >= 0) Value = Value.slice(0, EndPos);
					}
				}

				Option.text = Desc;
				Option.value = this.Name;
				Select.options.add(Option);
			}
		}

		ToList(Select?: HTMLOListElement | HTMLUListElement) {
			if (!Select) {
				return;
			} else if (!(Select instanceof HTMLOListElement) && !(Select instanceof HTMLUListElement)) {
				return;
			}

			let item: HTMLLIElement = Select.ownerDocument.createElement('li') as HTMLLIElement;

			item.innerText = this.Desc;
			Select.appendChild(item);
		}

		get copy () {
			return new vID (this.to$,this.List);
		}
	} // class vID

	export class qLX {
		Childs:qList[]|undefined;
		LType = CLType.None;

		Init () {
			this.Childs=undefined;
			this.LType=CLType.None;
		}

		constructor () {
			this.Init;
		}
	}

	export class xList extends RSD {
		get cl () { return 'xList'; }
	}

	export function newList (S='|') {
		return !S  || (S.slice(-1) >=' ') ? new qList (S) : new rList (S);
	}

	export function newLists (Str:string|string[]) {
		if ((typeof Str) === 'string') {
			let S = Str as string, D = S.slice (-1);
			let List:ListTypes = (D === '|') ? new qList (S) : new rList (S);
			return [List];
		}

		let Strs = Str as string[], len = Strs.length,
			count = 0, Lists=Array<ListTypes> (len);

		for (let S of Strs) {
			let D = S.slice(-1);
			if (!isDelim (D)) {
				D = '|';
				S += 'NODelim|'
			}
			
			if (D === '|') {
				Lists[count++] = new qList (S);
				continue;
			}

			let LStrs = S.split (D);
			LStrs.length = LStrs.length - 1;
			Lists[count++] = new rList (LStrs);
		}

		if (count !== len)
			Lists.length = count;

		return Lists;
	}


	class RSF extends xList {
		name='';
		prefix='';
		type='';
//		bbi:BBI;
		arr=false;
		RSDName='';
		dims='';

		get cl () { return 'RSF'; }

		get clear () {
			this.name='';
			this.prefix='';
			this.type='';
			this._bbi=undefined;
			this.Data=undefined;
			this.arr=false;
			this.RSDName='';
			this.dims='';

			return true;
		}

		setName (N='') {
			this.name = N;
		}

		setData (data:RSFldData, conName='') {
			this.arr = false;
			this.dims = '';
			this.prefix='';
			this._bbi=undefined;
			this.Data = data;
			this.RSDName = conName;

			if (!data) return;

			let bType = typeof data;
			switch (bType) {
				case 'string' :	return this.type = tStr;
				case 'number' : return this.type = tNum;
				case 'undefined' : this.type=tNone; return;

				case 'object' :
					let isArray = Array.isArray (data), rsd;

					if (isArray)
						this.arr = true;
					else {
						this.RSDName = (rsd = data as RSD).cl;
						return this.type = tRSD;
					}

					this.arr = true;
					
					if (!conName) {
						let Q = data as Array<any>;
						for (const q of Q)
							if (q) {
								conName = typeof q;
								if ((conName !== 'string')  &&  (conName !== 'number'))
									conName = (q as RSD).cl;

								break;
							}
					}

					switch (conName) {
						case '' : this.type = tStrs; data = undefined; return;
						case tStr : case 'tStrs' : case 'string' : return this.type = tStrs; return;
						case tNum : case 'tNums' : case 'number' : return this.type = tNums; return;
						default : this.RSDName = conName; return this.type = tRSDs;
					}
					break;

				default : throw 'Illegal data';  return;
			}
		}

		get clearPrefix () { this._bbi = undefined; this.prefix = ''; return true; }

		toPrefix (RSDName='') {
			if (this.prefix)
				return this.prefix;

			let arrStr = '', cName, bbi:BBI;
			switch (this.type) {
				case tStr:
					bbi = str2bbi (this.Data as string);
					if (bbi.byteLength !== (this.Data as string).length)
						throw 'Mismatch!';
					break;

				case tNum :
					bbi = num2bb (this.Data as number);
					break;

				case tRSD :
					let rsd = this.Data as RSD, rPrefix = rsd.toPrefix (RSDName);
					
					cName = rsd.cl;
					bbi = rsd._bbi;
					if (!RSDName  ||  (cName !== RSDName))
						arrStr = '[' + cName + ']';
					break;

				case tStrs:
					bbi = str2bbi ((this.Data as string[]).join (EndStr) + EndStr);
					arrStr = '[]';
					break;

				case tNums:
					let Nums = this.Data as number[];
					let AB = new ArrayBuffer (Nums.length * Float64Array.BYTES_PER_ELEMENT),
						newNums = new Float64Array (AB);
					bbi = newBuf (AB);
					newNums.fill (NaN);
					newNums.set (Nums);
					arrStr='[]';
					break;

				case tRSDs:
					let Arr = this.Data as RSD[];
					let dims = '', nBytes = 0,	offset = 0, count = 0, Ps:string[]=[], Bs:BBI[]=[];
					for (const r of Arr)
						if (r) {
							let pre = r.toPrefix (RSDName), bb = r._bbi;

							Ps.push (r.toPrefix (RSDName));
							Bs.push (bb as BBI);
							++count;
							if (bb) {
								nBytes += bb.byteLength
								dims += ' ' + bb.length.toString ();
							}
							else dims += ' 0';

							if (!cName)
								cName = r.cl;
						}
					arrStr = '[' + RSDArrayCh + RSDName + dims + ']';
					bbi = newBuf (nBytes);
					for (const bb of Bs) {
						if (bb) {
							bbi.set (bb,offset);
							offset += bb.byteLength;
						}
					}
					break;
			}

			this._bbi = bbi;
			this.prefix = this.type + arrStr + this.name + ':'+
				(this._bbi ? this._bbi.length.toString () : '0');
			console.log ('RSF.toPrefix: ^^' + this.prefix);
			return this.prefix;
		}

		fromPrefix (prefix:string, bbi:BBI, FieldRSD = '', offset=-1) {
			this.clear;
			if (!prefix)
				return;

			let arrayStr, dimStr, RSDName, isArray = false, nameStr, type = this.type = prefix[0];

			if (prefix[1] === '[') {
				let end = prefix.indexOf(']');

				nameStr = prefix.slice (end+1);
				if (arrayStr = prefix.slice (2,end)) {
					let space = arrayStr.indexOf (' ');
					if (space >= 0) {
						dimStr = arrayStr.slice (space);
						this.dims = dimStr;
						RSDName = arrayStr.slice (0,space);
					}
					else RSDName = arrayStr;

					if (RSDName  &&  (RSDName[0] === RSDArrayCh)) {
						RSDName = RSDName.slice (1);
						this.arr = isArray = true;
					}

					if (!RSDName)
						RSDName = FieldRSD;

					this.RSDName = RSDName;
				}
				else this.arr = isArray = prefix[0] !== tRSD;
			}
			else nameStr = prefix.slice (1);

			let colon = nameStr.indexOf (':'), name = nameStr.slice (0,colon),
				nBytes = Number (nameStr.slice (colon+1));

			if (bbi) {
				if (offset >= 0)
					bbi = bbi.slice (offset, nBytes);
				if (nBytes != bbi.byteLength)
					throw 'fromPrefix Bytes mismatch! nBytes = ' + nBytes.toString () + 
						', bbi =' + bbi.byteLength.toString () + ' bbistr=' + bb2str (bbi) + '=';
				}
			else { throw 'NIL bbi to fromPrefix!'; return;	}	// tragic error 
			

			if (isArray) {
				switch (type) {
					case tNum :
						this.type = tNums;
						if (nBytes)
							this.Data = new Float64Array (bbi);
						else this.Data = new Float64Array ();
						break;

					case tStr :
						this.type = tStrs;
						if (nBytes)
							this.Data = bb2str (bbi).split ('\n').slice (0,-1);
						else this.Data = new Array<string> ();
						this.Data = bb2str (bbi);
						break;

					case tRSD :
						this.type = tRSDs;

						let Dims = dimStr ? dimStr.split (' ') : [''], offset = 0,
							RSDs = Array<RSD> (Dims.length - 1), count = 0, off = 0;

						for (const D of Dims) 
							if (D) {
								let bytes = Number (D);

								if (bytes) {
									let buf = bbi.slice (off, bytes);
									off += bytes;
									RSDs[count++] = newRSD (buf);
								}
							}

						break;

					default : throw 'Undefined Type in fromPrefix!'
				}
			}
			else {	// non Array types
				switch (type) {
					case tNum :
						this.Data = bb2num (bbi);
						break;

					case tStr :
						this.Data = bb2str (bbi);
						break;

					case tRSD :
						this.Data = newRSD (bbi);
						break;

					default : throw 'Undefined Type in fromPrefix!'
				}
			}

			// need to set data based on this.type, take from existing PackField Code 
			

			this._bbi = bbi;
			this.name = name;
		}
	}


	export class qList extends xList {
		get cl () { return 'qList'; }

		constructor (Str:RSArgs='') {
			super (Str);
		}

		copy (NewName='') : RSD {
			return new qList (this.to$);
		}
	}

	export const NILList = new qList ();

	export class RSQ extends qList {
		Q	:	qList = new qList ();
		get cl () { return 'RSQ'; }
	}


	export class RSR extends qList {
		R	: rList = new rList ();
		get cl () { return 'RSR'; }

		get to$$ () : string [] {
			return this.R ? this.R.to$$ : [];
		}
	}

	export class Bead extends RSR {
		K : RSK = new RSK (this);

		get cl () { return 'Bead'; }

		private get toStrPrefix () {
			// let q = this.q.toS, r = this.r.toS;
			// return '$' + q.length.toString () + ',' + r.length.toString () + '$' + q + r;
			return '$';
		}
	}

	export class rList extends xList {
		K : RSK = new RSK (this);

		constructor (In? : RSArgs, name = '', desc = '') {
			super ();
			this.rConstruct (In, name, desc);
		}
		
		get iList () { return false; }
		get notIList () { return true; }

		get cl () { return 'rList'; }

		get isMom () { return true; }

/*
		constructor (Str:RSArgs='',name='',desc='') {
			super (Str);
			if (!Str)
				return;		// null rList

			if (desc === name)
				desc = '';
			let ND = desc ? (name + ':' + desc) : name;

			this.qstr = ND;		// default value of qstr, could be modified later...

			this.mark;

			let Strs:string[]=[], aType = '', array1;
			aType = typeof Str;

			if (aType === 'object') {
				if (array1 = Array.isArray (Str)) {
					
					let e = Str[0], eType = typeof e;
					if (eType === 'string')
						aType = 'string[]';
					else if (e instanceof xList)
						aType = 'List[]';
					else aType = 'RSD[]'; 
				}
				else aType = Str.constructor.name;
			}

			switch (aType) {
				case 'string' :
					array1 = true;
					Strs = strToStrings (Str as string);
					break;
				case 'string[]' :
					array1 = true;
					Strs = Str as string[];
					break;
				case 'List[]' :
					this.K.Set (Str as RSD[],false);
					console.log ('rList ' + this.qstr + ' created: ' + this.info);
					return;
				default : Strs = [];
			}

			if (!Strs.length) {
				console.log ('rList ' + this.qstr + ' created: ' + this.info);
				return;
			}

			let first = Strs[0];
			if (isDelim (first.slice(-1))) {
				this.rAddList (Strs);
				console.log ('rList ' + this.qstr + ' created: ' + this.info);
				return;
			}

			if (!ND) {	// use first string as name:desc
					let pair = new strPair ();
					pair.fromStr (first,':');
					if (pair.b === pair.a)
						pair.b = '';
					if (pair.b)
						ND = pair.a + ':' + pair.b;
					else ND = pair.a;
					this.qstr = ND;
				}
			if (ND)
				console.log ('  ND=' + ND + '.');
			this.addStr (Strs.slice(1));	//	need to call newLists[Symbol]..
			// console.log ('rList ' + this.qstr + ' created: ' + this.info);
		}
*/

		copy (NewName='') {
			let list = new rList (this.to$);
			if (NewName)
				list.Name = NewName;
			return list;
		}
	}


	export class rLOL extends rList {
		FM = this.rAddList('FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|');

		/*  Input Formats, defined by~FormatStr~

            FormatStr starts with first character which defines its nature,
            followed by additional characters in some cases

            # - number (including floating point)
            I - integer
            Onn - ordinal (+) integers, 0 allowed to indicate none (nn is limit if present)
            R - StartNumber  COMMA  EndNumber
            P - integer pair
            Ann - number array (COMMA separated)  (nn specifies size limit for array)
            {} - set of allowed strings inside brackets, choose one (or NONE)
            @ListName - choose member from named list
            $ - dollar amount, allows two digit cents included $$$.cc
            %nn - string limited to nn characters
            Unn - uppercase string
        */

		PL = this.rAddList('|Number:#|String:$|ArrayBuffer:[|');

		FT = this.rAddList(
			'Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|'); // added & tested full support for Num, Int, Str, Dollar, Nums, Range, Upper, Ord, Pair; Member Rough Support Added
		//
		CT = this.rAddList('Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|');

		LT = this.rAddList(
			'Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|'
		);

		DT = this.rAddList(
			'Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|'
		);
		EV = this.rAddList('Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|');
		RT = this.rAddList('Rt:Return|Ok|Fail|Equal|Unequal|Queue|');
		TD = this.rAddList('Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|');
		TS = this.rAddList(
			'Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|'
		);
		// Note that Tile Alignment is probably same as Tile Size, at least for now!
		Pr = this.rAddList('Pr:Process|Init|Read|Set|Clear|Default|');
		MT = this.rAddList('Mt:MessageType|Input|Output|Event|Trigger|Action|');
		AC = this.rAddList('Ac:Action|Init|Timer|Login|Logout|');
		LG = this.rAddList('Lg:Language|En:English|Es:Espanol|Cn:Chinese|');
		CY = this.rAddList('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
		Test = this.rAddList('Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|');

		get cl () { return 'rLOL'; }
	}

	export const rLoL = new rLOL ();

	function NData () { return new RSData () }

	export async function ReqAB (AB : ArrayBuffer): Promise<ArrayBuffer> {
		if (_ReqAB) {
			let response = await _ReqAB (AB);
			// console.log ('ReqAB.response bytes = ' + response.byteLength.toString ());
			return response;
		}
		else {
			throw InitStr;
			return NILAB;
		}

		let Q : any;
		Q = ()=>new RSData;
		let RP : NewData = Q as NewData;

		Reg (['List',()=>new qList (),NILDataReq])
	}

	var dNames=new Array<string>, dNews=new Array<NewData>,dEdits=new Array<DataReq>;

	export function Reg (A:any[]=[]) {
		// Args: NameStr, New(RSData)Func, Edit(RSData)Func
		let count = A.length;

		if (count % 3) {
			throw 'Reg requires triplets';
			return;
		}
		if (!count) { //clearing previous}
			dNames = [];  dNews = [];  dEdits = [];
		}

		if (!dNames.length)	// Need to add default system list
			Reg (['List',NILNew,NILDataReq]);	

		for (let i = 0; i < count; i += 3) {
			let Name = A[i] as string;

			if (!Name)
				throw ('NULL Name in Reg!');

			let NewFunc = A[i+1] as NewData, EditFunc=A[i+2] as DataReq;
			let f = dNames.indexOf (Name);
			if (f >= 0) {	//	replacing
				dNames[f] = Name; dNews[f] = NewFunc; dEdits[f]=EditFunc;
			}
			else { dNames.push (Name); dNews.push (NewFunc); dEdits.push (EditFunc); }
		}
	}
	
	export async function ReqPack (BP : BufPack) : Promise<BufPack>{
	  if (_ReqPack) {
		  let returnBP = await _ReqPack (BP);
		  // console.log ('ReqPack.BP = ' + BP.desc);
		  return returnBP;
	  }
	  else {
		  throw InitStr;
		  return NILPack;
	  }
	}

	export async function ReqRSD (RSDin : RSD) : Promise<RSD> {
		if (_ReqRSD) {
		  let returnRSD = await _ReqRSD (RSDin);
		  // console.log ('ReqPack.BP = ' + BP.desc);
		  return returnRSD;
		}
		else {
		  throw InitStr;
		  return NILRSD;
		}
	}
	
	export function InitReq (AB : ABReq, Pack : PackReq, rsd : RSDReq) { // , rsd : RSDReq) {
		_ReqAB = AB;
		_ReqPack = Pack;
		_ReqRSD = rsd;
		// _ReqRSD = rsd;
		console.log ('Functions Assigned!');
		return true;
	}
	
	export async function ReqStr (Query : string, Tile:string) : Promise<BufPack> {
		if (!Tile)
			return NILPack;

		let DPos = Query.indexOf ('|');
		let StrType;
		if (DPos >= 0) {
			StrType = Query.slice (0,DPos);
			Query = Query.slice (DPos + 1);
		}
		else StrType = 'Q';

		let BP = new BufPack ();
		console.log ('StrType=' + StrType + ',Query=' + Query + '.');
		BP.xAdd (StrType,Query);
		BP.addArgs (['.T',Tile]);
		
//		BP.add ([StrType,Query]);
	
		// console.log ('strRequest BP on client:\n' + BP.Desc ());
		// console.log ('BP.BufOut length = ' + BP.BufOut ().byteLength.toString ());
	
		let BPReply = await ReqPack (BP);
		return BPReply;
	}

	export async function ReqTiles () : Promise<string[]> {
		let BP = await ReqStr ('SELECT name from sqlite_master;','Q');
		// let TestBP = BP.copy ();
		// console.log (BP.desc);	// <----- my code/data works if THIS LINE IS running!
		
		let SQStr = "sqlite_";
		let SQLen = SQStr.length;

		let BPs = BP.unpackArray ();
		let Names : string[] = [];

		for (const P of BPs) {
			let Name = P.fStr ('name');
			// console.log ('Name:' + Name);

			if (Name.slice (0,SQLen) !== SQStr) {
				Names.push (Name);
				// console.log ('  ' + Name);
			}
		}

		// console.log ('After BP Ds= ' + BP.Ds.length.toString () + ' = ' + BP.desc);
		console.log ('ReqTiles=' + Names);
		return Names;
	}

	export class ReqInfo {
		Tile = 'S';
		Name = '';
		Type = '';
		Sub = '';
		Fields = '*';
		ID = 0;
	}
	
	export async function ReqPacks (R : ReqInfo) : Promise<BufPack[]> {
		let QStr = 'SELECT ' + R.Fields + ' FROM ' + R.Tile;
		let Condits = [];
		
		if (R.Type)
			Condits.push ('type=\'' + R.Type + '\'');
		if (R.Sub)
			Condits.push ('sub=\'' + R.Sub + '\'');
		if (R.Name)
			Condits.push ('name=\'' + R.Name + '\'');
		if (R.ID)
			Condits.push ('id='+R.ID.toString ());

		if (Condits.length) 
			QStr += ' WHERE ' + Condits.join (' AND ') + ';';
		else QStr += ';';

		let BP = await ReqStr  (QStr,R.Tile);

		if (BP.multi)
			return BP.unpackArray ();
		else return [];
	}

	export async function ReqByInfo (R : ReqInfo) : Promise<RSData[]> {
		let BPs = await ReqPacks (R);

		let Datas = new Array<RSData> (BPs.length);
		let i = 0;
		for (const P of BPs)
		{
			let D = new RSData (P);
			Datas[i++] = D;
		}
		return Datas;
	}

	export async function ReqRecs (Tile = 'S', Type = '', Sub = '', Name = '') : Promise<RSData[]>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		Info.Type = Type;
		Info.Sub  = Sub;
		Info.Name = Name;
		return await ReqByInfo (Info);
	}

	export async function ReqBufPack (Tile = 'S', ID : number|string) : Promise<BufPack>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		if ((typeof ID) === 'string')
			Info.Name = ID as string;
		else Info.ID = ID as number;

		let Datas = await ReqPacks (Info);
		if (Datas.length === 1)
			return Datas[0];

		return NILPack;		// found NONE, or TOO MANY!
	}

	export async function ReqData (Tile = 'S', ID : number|string) : Promise<RSData>
	{
		let P = await ReqBufPack (Tile, ID);
		return (P !== NILPack) ? new RSData (P) : NILData;
	}

	export async function ReqNames (Tile = 'S', Type = '', Sub = '') : Promise<RSData[]>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		Info.Type = Type;
		Info.Sub  = Sub;
		Info.Fields = 'name,desc,id';
		return await ReqByInfo (Info);
	}

	export async function ReqNames2 (Tile = 'S', Type = '', Sub = '') : Promise<RSData[]> {
		let QStr = 'SELECT * FROM ' + Tile + ' ';
		let TypeXP = Type ? ('type=\'' + Type + '\'') : '';
		let SubXP = Sub ? ('sub=\'' + Sub + '\'') : '';
		let WhereXP = ';';

		if (TypeXP && SubXP)
			WhereXP = 'WHERE ' + TypeXP + ' AND ' + SubXP + ';';
		else if (TypeXP)
			WhereXP = 'WHERE ' + TypeXP + ';'
		else if (SubXP)
			WhereXP = 'WHERE ' + SubXP + ';'

		QStr += WhereXP;
		
		let BP = await ReqStr  (QStr,Tile);
		// console.log ('BP Promised!' + BP.desc);
		
		if (!BP.multi)
			return [];

		let BPs = BP.unpackArray ();

		let Data = new Array<RSData> (BPs.length);
		let i = 0;
		for (const P of BPs)
		{
			let D = new RSData ();

			D.LoadPack (P);
			Data[i++] = D;
		}

		return Data;
	}

	

	export function Download(filename: string, text: string) {
		var e = document.createElement('a');

		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		e.setAttribute('download', filename);
		e.style.display = 'none';
		e.click();
	}

	export function DownloadAB(filename: string, binaryData: ArrayBuffer) {
		var blob = new Blob([binaryData], { type: 'application/octet-stream' });
		var url = URL.createObjectURL(blob);
	
		var e = document.createElement('a');
		e.setAttribute('href', url);
		e.setAttribute('download', filename);
		e.style.display = 'none';
		e.click();
	
		URL.revokeObjectURL(url); 
	}

	export function UploadAB(file: File): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () => {
				if (reader.result instanceof ArrayBuffer) {
					resolve(reader.result);
				} else {
					reject(new Error('Error reading file as ArrayBuffer'));
				}
			};

			reader.onerror = () => {
				reject(new Error('Error reading file'));
			};

			reader.readAsArrayBuffer(file);
		});
	}

	export function isDigit(ch: string): boolean {
		if (ch)
			ch = ch[0];
		else return false;

		if ((ch <= '9')  &&  ch.length)
				return ((ch >= '0') || (ch === '-') || (ch === '.'));

		return false;
	}		

	export function ChkBuf (Buf : ArrayBuffer) {
		const UInt8View = newBuf (Buf);

		let Sum = 0, i = 0;
		for (const B of UInt8View)
			Sum += B * ((++i & 31) + 1);

		return Sum;
	}

	function isDelim(ch: string): boolean {
		return DelimList.indexOf (ch) >= 0;
	}

	export function FromString(Str: string) {
		let Strs = Str.split('\n');

		let limit = Strs.length;
		for (let i = 0; i < limit; ++i) {
			let Pos = Strs[i].indexOf('\t');
			if (Pos >= 0) Strs[i] = Strs[i].slice(0, Pos).trimEnd();
		}

		return Strs;
	}

	type ListArgs	= BufPack|qList[]|string|string[]|undefined;
	type ListTypes=qList|rList|undefined;
	type NewListArgs = string|string[]|ListTypes[];

	type SelectArgs = HTMLSelectElement | HTMLOListElement | HTMLUListElement | undefined;
	type OptionArgs = HTMLOptionElement | undefined;
	type IOArgs = BufPack | Function | undefined;

	// Convert DBclass to/from BufPack
	export interface DataVert {
		(In: IOArgs): IOArgs;
	}

	export class DataConvert {
		Name: string;
		Convert: DataVert;

		constructor(Name1: string, Conv1: DataVert) {
			this.Name = Name1;
			this.Convert = Conv1;
		}
	}

	export function FmtStrFromDesc(Desc: string) {
		if (Desc[0] === '[') {
			let EndPos = Desc.indexOf(']');
			if (EndPos >= 0) return Desc.slice(1, EndPos);
		}

		return '';
	}



	export class NameData {
		Name: string;
		DataType: string;
		Buffer = NILAB;

		constructor(Name1: string, DType: string, Buf: ArrayBuffer = NILAB) {
			this.Name = Name1;
			this.DataType = DType;
			this.Buffer = Buf;
		}
		get cl () { return 'NameData'; }
	}

	export class NameBuffer {
		Name: string;
		Type: string;
		Buffer: IOArgs;
		Data: any | undefined;

		constructor(Name1: string, DType: string, Buf: IOArgs = undefined) {
			this.Name = Name1;
			this.Type = DType;
			this.Buffer = Buf;
		}
	}

	export function ME() { }
	export function dVilla() { }	// default villa, based on includes (ME vs. system villa)

	export function setVilla (V : string) {
		if (!V) return;

		if (V === ('-' + myVilla))
			myVilla = '';

		else if (!myVilla)
			myVilla = V;
	}



	export class RID {		// Relational ID, used for all RSData records
		villa='';
		tile='';
		type='';
		sub='';
		ID=NaN;
		multi:number[]|string|undefined;
		
		fromStr (Str='') {
			// String format: ID(s separated by ,)_TileName,VillaName
			// VillaName,	if '', assume ME()
			// TileName		must ALWAYS be set
			//	ID(#)  * means ALL (0)
			// if VillaName absent, use ME (myVilla)
			if (!Str) return;

			let NPos = Str.indexOf ('_');
			if (NPos < 0)
				throw ('_ required!');

			let numStr = Str.slice (0,NPos), vStr = Str.slice (NPos + 1);
			let CPos = vStr.indexOf (',');
			if (CPos >= 0) {
				this.villa = vStr.slice (0,CPos);
				this.tile = vStr.slice (CPos+1);
			}
			else {
				this.tile = vStr;
			}

			switch (numStr[0]) {
				case '?' : this.multi = numStr.slice (1); break; 	// query string
				case 'T' :
					let Comma = numStr.indexOf (',');
					if (Comma > 0) {
						this.sub = numStr.slice (Comma+1);
						this.type = numStr.slice (1,Comma);
					}
					else this.type = numStr.slice (1);
					this.ID = 0;
					break;

				default : 
					if (numStr.indexOf (',') >= 0)	{	// multiple number IDs!
						let Nums = numStr.split (',');
						let i = 0, count = Nums.length;
						let Ns=Array<number>(count);
						for (const N of Nums) {
							Ns[i]=Number (Nums[i]);
							++i;
							}
						this.multi=Ns;
					}
					else {	// single ID, no comma
						this.ID = Number (numStr);
					}
				}
		}

		constructor (Str='') { this.fromStr (Str); }

		get to$ () {
			let VTStr = this.villa ? (this.villa + ',' + this.tile) : this.tile;

			let NStr = '';
			let M = this.multi;

			if (M) {
				if ((typeof M) === 'string') {		// query string
					NStr += '?' + M as string;
				}
				else {	// number array (IDs)
					let A = M as number[]
					for (const A1 of A)
						NStr += A1.toString () + ',';
					NStr = NStr.slice (0,-1);
				}
			}
			else {		// single ID number
				NStr += this.ID.toString ();
			}

			return NStr + '_' + VTStr;
		}

		Reg () {
			if (_RegRID  &&  (this.villa != _RegRID))
				this.villa = _RegRID;
		}

		get copy () {
			return new RID (this.to$);
		}
	}

	export class RSData {
		Name = '';
		Desc = '';
		_type = 'Data';
		_rID? : RID;
		_Tile = 'S';
		Sub = '';
		Str = '';
		List? : qList;
		Pack? : BufPack;
		Details = '';
		Data: any;

		NameBufs: NameBuffer[] | undefined;

		get cl () { return 'RSData'; }

		PostLoad (P : BufPack) {}

		get NIL () { return false; }

		get Type () { return this._type; }

		get size () {
			let R = 0;
			if (this.Name || this.Desc || this.Type  ||  (this._rID))
				R = -1;

			return R;
		}

		get ID () { return this._rID ? this._rID.ID : 0; }
		// get RID () { return this._rID.copy; }

		get Tile () { return this._Tile; }
		get Villa () { return this._rID ? this._rID.villa : ''; }

		private setTile (T='S') {
			this._Tile = T;
			if (this._rID)
				this._rID.tile = T;
		}

		setRID (rID1 : RID) {
			if (this === NILData)
				return;

			if ((!this._rID) || !this._rID.ID)
				this._rID = rID1;
			}

		get preDesc () {
			return this.Name + '[' + this.Type + ']' + (this.Desc? (':'+this.Desc):''); 
		}

		get desc () { return this.preDesc; }


		LoadPack(P: BufPack) {
			if ((this === NILData)  ||  (P === NILPack))
				return;

			if (!P  ||  (P === NILPack))
				return;

			this.Name = P.fStr ('name');
			this.Desc = P.fStr ('desc');
			this._type = P.fStr ('type');
			this.setTile (P.fStr ('.T'));
			this.Str = P.fStr ('str');
			this.Sub = P.fStr ('sub');
			// this.ID = P.num ('.ID');
			this.List = P.fList ('list');
			
			if (!this.List)
				this.List = new qList ();

			this.Pack = P.fPack('pack');
			if (this.Pack === NILPack)
				this.Pack = new BufPack ();

			let ridStr = P.fStr ('.rid');
			if (ridStr) {
				this._rID = new RID (ridStr);
				log ('Assigning RID "' + ridStr + '" to ' + this.desc)
			}

			if (!this.List || !this.Pack)
				console.log ('LoadNILs!');

//			if (!this.ID)
//				this.ID = P.num ('id');

			this.Details = P.fStr ('details');
			this.Data = P.fData ('data');

			this.PostLoad (P);
		}

		constructor (P = NILPack) {
			if (!this.Pack)
				log ('RSData.NILs!');

			if (!this.List)
				log ('RSData.List NIL!');

			this.LoadPack (P);
		}

		PostSave (P : BufPack) {}
		SavePack (P : BufPack = NILPack) {
			if (this === NILData)
				return NILPack;

			if (!P  || (P === NILPack))
				P = new BufPack ();

			P.addArgs ([	'name',	this.Name,
				'desc',	this.Desc,
				'type',	this.Type,
				'.T',	this.Tile,
				'str',	this.Str,
				'sub', this.Sub,
				'details',	this.Details,
				'.ID',	this.ID,
				'list', this.List,
				'pack', this.Pack,

				'data',	this.Data
			]);

			this.PostSave (P);
			return P;
		}

		ToValue() {
			let ValStr = '';
			return this.Name + ',' + this.Type + ',' + this.ID.toString() + ValStr;
		}

		FromOption(Item: SelectArgs) {
			let text, value;

			if (this === NILData)
				return;

			if (Item instanceof HTMLOptionElement) {
				let Option = Item as HTMLOptionElement;
				text = Option.text;
				value = Option.value;
			} else if (Item instanceof HTMLOListElement) {
				let OItem = Item as HTMLOListElement;
				text = OItem.innerText;
				value = OItem.attributes.getNamedItem('value');
			} else if (Item instanceof HTMLUListElement) {
				let UItem = Item as HTMLUListElement;
				text = UItem.innerText;
				value = UItem.attributes.getNamedItem('value');
			}
		}

		static ToFrom(In: IOArgs): IOArgs {
			// Should raise exception!
			return undefined;
		}

		async toDB () {
			if (this === NILData)
				return;

			if (!this.Tile) this.setTile ('S');

			let P = this.SavePack ();
				P.xAdd ('Q',this.ID ? 'U' : 'I');

			P = await ReqPack (P);
			return P.fNum ('changes') > 0;
		}

		NewThis () : RSData { return new RSData (); }

		get copy () {
			let P = this.SavePack ();
			return new RSData (P);
		}
	}

	export const NILData = new RSData ();

	const SiNew='$', SiLoad='B', SiEdit='D';

	class SpecInfo {
		type:string;
		pack=NILPack;
		rsData=NILData;

		cName='';
		dType='';

		get cl () { return 'SpecInfo'; }

		constructor (Data : SpecArgs) {
			if (typeof (Data) === 'string')
			{
				this.type = Data as string;
				if (this.type) {
					this.cName = 'String';
					this.dType = SiNew;
				}
			}
			else {
				this.cName = Data.constructor.name;
				if (this.cName === 'BufPack') {
					this.type = (this.pack = (Data as BufPack)).fStr ('type');
					this.dType = SiLoad;
				}
				else {
					this.type = (this.rsData = (Data as RSData)).Type;
					this.dType = SiEdit;
				}
			}
		}
	}

	export class RSDataType {
		Type : string;
		Func : Function;

		constructor (Type1 : string, Func1 : Function) {
			this.Type = Type1;
			this.Func = Func1;
			if (!(Func1 instanceof RSData))
				throw 'NOT RSData!'
		}
	}

	var PTDs = new Array<PackToDataFunc> ();

    export function PackToData (P : BufPack) : RSData {
		let Type = P.fStr ('type');

		switch (Type) {
			case 'List' : return new RSData (P); 
		}

		for (const PTD of PTDs) {
			let D = PTD (P, Type);
			if (D != NILData)
				return D;
			}

		return NILData;
	}

	var _Types : string[] = [];
	var _Classes = new Array<Function> ();

	export function RegPackToData (PTD : PackToDataFunc) {

	}

	export function DataToSelect(Data: RSData[], Select: SelectArgs) {}

	export function SelectToData(Select: SelectArgs): RSData[] {
		return [];
	}

	export function RSDataVert(In: IOArgs): IOArgs {
		if (In) {
			if (In.constructor.name === 'BufPack') {
				let Pack = In as BufPack;
				let Data = new RSData();
				Data.Name = Pack.fStr('name');
				Data._type = Pack.fStr('type');
				Data.Str = Pack.fStr('str');
			} else {
				// must be class for conversion
			}
		} else return undefined;
	}

	const TileStrings: string[] = [
		'TS1:TileStrings Desc',
		'T\ta|name:Full|\ts|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|\t',
		' T\ta|name:Top|\ts|background:magenta|min-height:150px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'   T\ta|name:Top|\ts|background:magenta|min-height:50px|\t',
		'   T\ta|name:Bottom|\ts|background:magenta|min-height:100px|\t',
		'  T\ta|name:Right|\ts|background:cyan|width:100%|display:flex|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:white|min-height:350px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'  T\ta|name:Middle|\ts|background:cyan|width:100%|display:flex|\t',
		'  T\ta|name:Right|\ts|background:yellow|min-width:200px|\t'
	];

	class TileID {
		tnum: number;
		vnum: number;
		tname: string;
		vname: string;
		_Str: string;

		constructor(Str: string) {
			this._Str = Str = Str.trim ();

			let NamEnd = Str.indexOf(':');
			if (NamEnd >= 0) {
				this.tname = Str.slice(0, NamEnd);
				this.vname = Str.slice(NamEnd + 1);
			} else {
				this.tname = Str;
				this.vname = '';
			}

			this.tnum = 0;
			this.vnum = 0;
		}

		Valid(): boolean {
			if (this.tnum) return true;
			else if (this.tname) return true;

			return false;
		}

		ToString(): string {
			if (this.vname) return this.tname + ':' + this.vname;
			return this.tname;
		}
	}

	export class TDE extends RSD {
		//  TileDefElement, for defining Tiles
		level = 0;
		tileID?: TileID;
		TList?:rList;
		Lists:ListTypes[]=[];
		aList?:qList;
		sList?:qList;
		varList?:qList;
		jList?:qList;

		nLists = 0;
		parent = 0;
		prev = 0;
		next = 0;
		first = 0;
		last = 0;

		listByName (Name:string) {
			if (!this.Lists)
				return undefined;

			for (const C of this.Lists) {
				if (C  &&  (C.Name === Name)) {
					console.log ('  listByName(' + Name + ')=' + C.to$);
					return C;
				}
			}
			return undefined;
		}

		qListByName (name:string) {
			let L = this.listByName (name);
			if (L  &&  L.cl === 'qList') 
				return L as qList;
		}

		constructor(Str: string|rList) {
			super();

			let List1 = (typeof Str) === 'string'? new rList (Str as string) : Str as rList;
			if (!List1)
				return;

			this.TList = List1;
			// console.log('TDE List[' + this.List.Name + ']=' + this.List.fStr + '.');

			let K = this.K;
			if (!K)
				return;

			this.Lists = K.Kids as ListTypes[];
			this.aList = this.qListByName ('a');
			this.sList = this.qListByName ('s');
			this.varList = this.qListByName ('v');
			this.jList = this.qListByName ('j');

			if (this.Lists) {
				for (const C of this.Lists)
					if (C)
						console.log ('   TDE Child:' + C.Name + '=' + C.to$);
			}

			this.level = List1.indent;
			this.tileID = new TileID(List1.Name);
		}

		get to$ () {
			return 'TDEStr!'
		}

		get info () {
			return super.info + ' List=' + (this.TList ? this.TList.to$ : 'TList=NIL');
		}
	}

	export class pList {
		IDType = '';
		ValType = 0;
		count = 0;
		numIDs : number[]=[];
		strIDs : string[]=[];
		values : any[]=[];

		constructor (SampleID : number|string|BufPack|RSData) {
			let IDType = (typeof SampleID);
			switch (IDType) {
				case 'number' : this.IDType = tNum; break;
				case 'string' : this.IDType = tStr; break;
				case 'object' :
					let IDType = SampleID.constructor.name;
					if (IDType === 'BufPack')
						this.IDType = tPack;
					else if (SampleID instanceof (RSData))
						this.IDType = tData;
					else this.IDType = tNone;
			}
		}

		index (ID : number|string) {
			if (this.IDType === tNum)
				return this.numIDs.indexOf (ID as number);
			else return this.strIDs.indexOf (ID as string);
		}

		add (IDList :string|any[]) {
			let Arr=[];
			let len,numID=0,strID='';
			let IDT=this.IDType;
			let Nums = (IDT === tNum);

			if ((typeof IDList) === 'string') {
				if (IDList[0] === '|')
					IDList = (IDList as string).slice (1);
				if (IDList[IDList.length-1] === '|')
					IDList = (IDList as string).slice (0,(IDList as string).length - 1);

				let Strs = (IDList as string).split ('|');
				len = Strs.length;
				if ((len & 1)  || !len)
					throw ('Requires pairs of ID/value');

				Arr.length = len;
				for (let i = 0; i < len; i += 2) {
					Arr[i] = Nums ? Number(Strs[i]) : Strs[i];
					Arr[i+1]=Strs[i+1];
				}
			}
			else { Arr = IDList as any[]; len = Arr.length; }

			if (!len  || (len & 1))
				throw 'Requires pairs of ID/value';

			let NullID = Nums? 0 : '';

			for (let i = 0; i < len; i += 2) {
				let ID = Arr[i];

				let ind = this.index (ID);
				if (ind >= 0)	//we found, must replace it!
					this.values[ind] = Arr[i+1];
				else {	// new ID, must add...
					ind = this.index (NullID);
					if (ind >= 0) {	// found an empty slot
						if (Nums)
							this.numIDs[ind] = ID as number;
						else this.strIDs[ind] = ID as string;

						this.values[ind] = Arr[i+1];
					}
					else {
						if (Nums)
							this.numIDs.push (ID as number);
						else this.strIDs.push (ID as string);

						this.values.push (Arr[i+1]);
						this.count++;
					}
				}
			}
		}

		del (ID : number|string) {
			let ind = this.index (ID);
			if (ind < 0)
				return false;

			let Nums = this.IDType === tNum;
			if (Nums) {
				this.numIDs[ind] = 0;
			}
			else this.strIDs[ind] = '';
			this.values[ind] = undefined;
		}

		push (D : BufPack|RSData) {
			if (D.constructor.name === 'BufPack') 
				this.add ([(D as BufPack).fStr ('rid'), D]);
			else {
				if ((D as RSData)._rID)
					this.add ([((D as RSData)._rID as RID).to$, D]);
			}


			// this.add ([(D.constructor.name === 'BufPack') ?
			//	(D as BufPack).fStr ('rid') : (D as RSData).RID.to$, D]);
		}
		
		get toStr () {
			let Nums = (this.IDType === tNum);
			let Str = '';

			let len = Nums ? this.numIDs.length : this.strIDs.length;

			for (let i = 0; i < len;) {
				let IDStr = Nums ? this.numIDs[i].toString () : this.strIDs[i];
				if (!IDStr &&  IDStr === '0')
					continue;	// skip the blanks

				let ValStr = this.values[i].toString ();

				Str += IDStr + '|' + ValStr + ((++i < len) ? '|' : '');
			}
			return Str;
		}
	}

	export class vFast {
		Names : Array<string>=[];
		Values : Array<string>=[];

		constructor (Str1 : string|qList='') {
			let List = ((typeof Str1) === 'string') ? new qList (Str1 as string) : Str1 as qList;

			let VIDs = List.qToVIDs;
			let count = VIDs.length;
			if (count) {
				this.Names.length = count;
				this.Values.length = count;

				let i = 0;
				for (const ID of VIDs) {
					this.Names[i] = ID.Name;
					this.Values[i++] = ID.Desc;
				}
			}
		}

		indexByName (name:string) {
			return this.Names.indexOf (name);
		}

		indexByValue (value : string) {
			return this.Values.indexOf (value);
		}

		indexByNum (num = 0) {
			return this.indexByValue (num ? num.toString () : '');
		}

		name (value : string) {
			let i = this.indexByValue (value);
			return (i >= 0) ? this.Names[i] : '';
		}

		value (name : string) {
			let i = this.indexByName (name);
			return (i >= 0) ? this.Values[i] : '';
		}

		add (NVs : Array<any>) {
			let Old = this.Names.length;
			let len = NVs.length
			if (len & 1)
				throw "Must be name/value pairs!";

			for (let i = 0; i < len;) {
				let name = NVs[i++];
				let value = NVs[i++];

				if (!name)
					throw 'Name must be set!';

				if (Old) {	// try to replace existing
					let found = this.Names.indexOf (name);
					if (found >= 0) {
						this.Values[found]=value;
						continue;
					}
				}

				this.Names.push (name);
				this.Values.push (value);
			}
		}

		del (name : string) {
			if (!name)
				throw "Cannot delete NULL name";

			let found = this.Names.indexOf (name);
			if (found >= 0) {
				this.Names[found]='';
				this.Values[found]='';
				return true;
			}
			else return false;
		}

		toList () {
			let qstr = '|';
			let len = this.Names.length;

			for (let i = 0; i < len;++i) {
				let name = this.Names[i];
				if (name)
					qstr += name + ':' + this.Values[i] + '|';
			}

			return new qList ((qstr.length > 1)?qstr : '');
		}

		clear () {
			this.Names=[];
			this.Values=[];
		}

		get empty () { 
			for (const N of this.Names) {
				if (N)
					return false;
			}

			return true;
		}

		get count () {
			let C = 0; 
			for (const N of this.Names) {
				if (N)
					++C;
			}

			return C;
		}
	}

	export class TileList  {
		tiles:TDE[]=[];

		constructor(Str1: string[] | string | rList | RSR = '') {
			let Strs, List, R, Lists, cl, rsd;

			console.log ('TileList (' + Str1 as string + ')');

			if ((typeof Str1) === 'string') {
				if (Str1 as string)
					Strs = strToStrings (Str1 as string);
			}
			else if (Array.isArray (Str1))
				Strs = Str1 as string[];
			else cl = (rsd = Str1 as RSD).cl;

			
			if (Strs) {
				List = new rList (Strs);
				if (!List.K)
					return;		// panic, should not happen

				Lists = List.K._kids as ListTypes[];
			}
			else {
				if ((cl === 'rList')  ||  (cl === 'RSr')) {
					R = List = Str1 as rList;
					Strs = R.to$$;
				}
				else if (Str1 instanceof RSR) {
					R = List = (Str1 as RSR).R;
					if (R)
						Strs = R.to$$;
				}
			}


			if (!List  ||  !List.K) {
				throw 'NIL TileList!';
				this.tiles = [];
				return;
			}

			let i = 0, Ls = List.K._kids as ListTypes[];
			this.tiles = Array(Ls.length + 1);
			for (const L of Ls)
				if (L) this.tiles[++i] = new TDE (L as rList);

			this.tiles.length = i + 1;
			this.Links();

			console.log ('**** TileList.Links, Str = \n' + this.toStr);
		}

		Links() {
			// calculate relations   for the TDEs
			let Tiles: TDE[] = this.tiles;
			let limit = Tiles.length;

			for (let tnum = 0; ++tnum < limit; ) {
				// each TDE/tile
				let i;

				let me = Tiles[tnum];
				let mylev = me.level;
				let parentlev = mylev - 1;
				let childlev = mylev + 1;
				let lev;

				me.first = me.next = me.parent = me.prev = 0;

				for (i = tnum; --i > 0; )
					if ((lev = Tiles[i].level) >= parentlev) {
						if (lev == parentlev) {
							me.parent = i;
							break;
						} else if (lev == mylev && !me.prev) me.prev = i;
					}

				for (i = me.last = tnum; ++i < limit; )
					if ((lev = Tiles[i].level) >= mylev) {
						if (lev === mylev) {
							me.next = i;
							break;
						}
						me.last = i;
						if (i > 10) console.log('i = ' + i.toString() + ':' + i);
						if (lev == childlev && !me.first) me.first = i; // first child
					} else break;
			} // for each TDE/tile
		}

		get toStr () {
			let Tiles = this.tiles;
			let limit = Tiles.length;
			let Str = 'TILELIST *** TOSTR:  ' + (limit-1).toString () + ' Tiles.\n';

			for (let i = 0; ++i < limit; ) {
				let me = Tiles[i];

				let NewStr = 'Tile#' + i.toString () + '.' + 
					(me.TList ? me.TList.to$ : '@NOLIST@') +
					'\t' +
					i.toString() +
					'.level=' +
					me.level.toString() +
					' parent=' +
					me.parent.toString() +
					' prev=' +
					me.prev.toString() +
					' next=' +
					me.next.toString() +
					' first=' +
					me.first.toString() +
					' last=' +
					me.last.toString() +
					' #=' +
					(me.last - i + 1).toString() +
					' TileID=';

				if (me.tileID) NewStr += me.tileID.ToString();
				else NewStr += 'NONE';

				Str += NewStr + '\n';

				if (me.Lists) {
					for (let c = 0; c < me.Lists.length; ) {
						let List = me.Lists[c++];
						if (List) {
							NewStr = '\t\t List.Name=' + List.Name + '=' + List.to$;
							Str += NewStr + '\n';
						}
					}
				}
			}
			return Str;
		}

		toSelect(Select1: HTMLSelectElement | HTMLOListElement | HTMLUListElement | undefined) {
			let Tiles = this.tiles;
			let limit = Tiles.length;

			let Select = Select1 as HTMLSelectElement;

			Select.options.length = 0;

			for (let i = 0; ++i < limit; ) {
				let Option: HTMLOptionElement = document.createElement('option') as HTMLOptionElement;

				let Tile = Tiles[i];
				let List = Tile.TList;
				if (Tile && List && Tile.tileID) {
					let Str = '-----------------------------------------------------';
					Str = Str.slice(0, Tile.level * 3);
					Option.text = Str + i.toString() + '.' + Tile.tileID.ToString();
					//                  Option.value = this.ToExtraStr ();

					Option.setAttribute('name', 'N' + i.toString());
					let NameStr = Option.getAttribute('name');
					Option.style.color = 'pink';
					let ColorStr = Option.style.color;
					console.log('Option Name = ' + NameStr);
					console.log('Color = ', ColorStr);

					Select.options.add(Option);
				}
			}
		}
	}



/*


	export class TileList  {
		tiles:TDE[];

		constructor(Str1: string[] | string | rList | RSr | RSR = '') {
			let Strs, List;
			console.log ('TileList (' + Str1 as string + ')');

			if ((typeof Str1) === 'string') {
				if (Str1 as string)
					Strs = strToStrings (Str1 as string);
			}
			else if (Array.isArray (Str1))
				Strs = Str1 as string[];
			{
				if (Str1 instanceof rList) 
					List = Str1 as rList;
				else if (Str1 instanceof RSr) {
					let R = Str1 as RSr;
					Strs = R.to$$;
				}
				else if (Str1 instanceof RSR) {
					let R = Str1 as RSR;
					Strs = R.to$$;
				}
			}

			if (Strs)
				List = new rList (Strs);

			if (!List) {
				throw 'NIL TileList!';
				this.tiles = [];
				return;
			}

			let i = 0, Lists = List._k._kids as ListTypes[];
			this.tiles = Array(Lists.length + 1);
			for (const L of Lists)
				if (L) this.tiles[++i] = new TDE (L as rList);

			this.tiles.length = i + 1;
			this.Links();

			console.log ('**** TileList.Links, Str = \n' + this.toStr);
		}

		Links() {
			// calculate relations   for the TDEs
			let Tiles: TDE[] = this.tiles;
			let limit = Tiles.length;

			for (let tnum = 0; ++tnum < limit; ) {
				// each TDE/tile
				let i;

				let me = Tiles[tnum];
				let mylev = me.level;
				let parentlev = mylev - 1;
				let childlev = mylev + 1;
				let lev;

				me.first = me.next = me.parent = me.prev = 0;

				for (i = tnum; --i > 0; )
					if ((lev = Tiles[i].level) >= parentlev) {
						if (lev == parentlev) {
							me.parent = i;
							break;
						} else if (lev == mylev && !me.prev) me.prev = i;
					}

				for (i = me.last = tnum; ++i < limit; )
					if ((lev = Tiles[i].level) >= mylev) {
						if (lev === mylev) {
							me.next = i;
							break;
						}
						me.last = i;
						if (i > 10) console.log('i = ' + i.toString() + ':' + i);
						if (lev == childlev && !me.first) me.first = i; // first child
					} else break;
			} // for each TDE/tile
		}

		get toStr () {
			let Tiles = this.tiles;
			let limit = Tiles.length;
			let Str = 'TILELIST *** TOSTR:  ' + (limit-1).toString () + ' Tiles.\n';

			for (let i = 0; ++i < limit; ) {
				let me = Tiles[i];

				let NewStr = 'Tile#' + i.toString () + '.' + 
					(me.TList ? me.TList.toS : '@NOLIST@') +
					'\t' +
					i.toString() +
					'.level=' +
					me.level.toString() +
					' parent=' +
					me.parent.toString() +
					' prev=' +
					me.prev.toString() +
					' next=' +
					me.next.toString() +
					' first=' +
					me.first.toString() +
					' last=' +
					me.last.toString() +
					' #=' +
					(me.last - i + 1).toString() +
					' TileID=';

				if (me.tileID) NewStr += me.tileID.ToString();
				else NewStr += 'NONE';

				Str += NewStr + '\n';

				if (me.Lists) {
					for (let c = 0; c < me.Lists.length; ) {
						let List = me.Lists[c++];
						if (List) {
							NewStr = '\t\t List.Name=' + List.Name + '=' + List.to$;
							Str += NewStr + '\n';
						}
					}
				}
			}
			return Str;
		}

		toSelect(Select1: HTMLSelectElement | HTMLOListElement | HTMLUListElement | undefined) {
			let Tiles = this.tiles;
			let limit = Tiles.length;

			let Select = Select1 as HTMLSelectElement;

			Select.options.length = 0;

			for (let i = 0; ++i < limit; ) {
				let Option: HTMLOptionElement = document.createElement('option') as HTMLOptionElement;

				let Tile = Tiles[i];
				let List = Tile.TList;
				if (Tile && List && Tile.tileID) {
					let Str = '-----------------------------------------------------';
					Str = Str.slice(0, Tile.level * 3);
					Option.text = Str + i.toString() + '.' + Tile.tileID.ToString();
					//                  Option.value = this.ToExtraStr ();

					Option.setAttribute('name', 'N' + i.toString());
					let NameStr = Option.getAttribute('name');
					Option.style.color = 'pink';
					let ColorStr = Option.style.color;
					console.log('Option Name = ' + NameStr);
					console.log('Color = ', ColorStr);

					Select.options.add(Option);
				}
			}
		}
	}

*/
	export class IOType {
		type: number = 0;
		subTypes: number[] | undefined;
	}

	export class JxnDef {
		name: string = '';
		process: number = 0;
		Input: IOType | undefined;
		Output: IOType | undefined;
	}

	export class LoL {	//	LoL
		Lists: qList[] = [];

		List (Name: string) {
			let Lists = this.Lists;
			for (const L of Lists)
				if (L.Name === Name) return L;
		}

//		type ListArgs	= BufPack|vList[]|string|string[]|undefined;

		add (Q : qList|string|string[], replace = false) : qList {
			let List : qList|undefined, Strs, len, i=0;

			if (Array.isArray (Q)  &&  (len = Q.length)) {
				if (len)
				{
					if ((typeof (Q[0])) === 'string')
						Strs = Q as string[];
					else {
						Strs = Array<string>(len);
						for (const L of Q)
							Strs[i++] = L;
					}
				}
				else Strs = [''];
			}
			else if ((typeof Q) === 'string') {
				Strs = [Q as string];
			}
			else Strs = [''];


			for (const S of Strs) {
				List = new qList (S);
				if (replace) {
					let Old = this.List(List.Name);
					if (Old) {
						let index = this.Lists.indexOf (Old);
						if (index >= 0) {
							this.Lists[index] = List;
							continue;
						}
					}
				}
				this.Lists.push (List);
			}

			return List ? List : new qList ();
		}

		constructor (Lists:ListArgs=undefined) {
			this.add (Lists as string|string[]|qList);
		}

		get toStrs () : string[] {
			let Strs = [];
			for (const L of this.Lists)
				Strs.push (L.to$);
			return Strs;
		}

		get copy () {
			return new LoL (this.toStrs);
		}

		async Defines(FileName = 'Consts.ts') {
			let DocStr = '\n\n\n/*  Documentation Names/Desc\t___________________\n\n';

			let DefineStr = '/*\tDefines for vLists\t*/\n\n';

			DefineStr += 'CList = ' + typeof (qList) + '\n';

			console.log('Reading TileStrings!');
			let NewTileList = new rList(TileStrings);
			console.log('Finished reading TileStrings');

			//	TL = new TileList(TileStrings);
			console.log('Testing NewTileList');
			TL = new TileList(NewTileList);
			console.log('TileList is read from NewTileList');

			if (LstEdit.TileSelect) TL.toSelect(LstEdit.TileSelect);

			let TString = TL.toStr;

			let LongList = new qList (TileStrings.join('\n') + '\n');

			DocStr += '\n Dump of LongList...\n' + LongList.to$ + '\n End of LongList Dump.  \n';
			DocStr += 'LongList Name=' + LongList.Name + ' Desc=' + LongList.Desc + '\n\n';

			DocStr += '\n' + TString + '\n*/\n';

			DefineStr += DocStr;

			if (this.Lists[0]) Download (FileName, DefineStr);

/*
			for (let i = 0; i < CL.Lists.length; ++i) {
				let List = CL.Lists[i];
				let Pack = List.SavePack ();
				Pack.xAdd ('Q','I');
				sql.bInsUpd (Pack);
			}
*/

			let BP = new BufPack('TEST', 'Details...asdfasdfas');
			BP.addArgs([
				'Num1',
				123,
				'Num2',
				-789.123,
				'ShortStr',
				'ABC',
				'LongStr',
				'0123456789',
			]);

			console.log('Incoming Buf:' + '\n' + BP.desc);
			let NewBuf = BP.bufOut ();
			let Check1 = ChkBuf (NewBuf);

			BP.bufIn (NewBuf);
			console.log('Resultant Buf:' + '\n' + BP.desc);

			NewBuf = BP.bufOut ();
			let Check2 = ChkBuf (NewBuf);

			console.log ('Check1/2 = ' + Check1.toString () + ' ' + Check2.toString ());

			let IDList = new pList (0);
			IDList.add ('1|ABC|2|DEF|26|XYZ');
			IDList.add ('2|BCD|');
			console.log ('IDList=' + IDList.toStr + '.');
		}

		toQList(): qList {
			let limit = this.Lists.length;

			let qstrs: string[] = ['LL:LoL'];
			let NewStr: string;

			for (let i = 0; i < limit; ++i) {
				let List = this.Lists[i];

				if (List.Desc && List.Desc !== List.Name) NewStr = List.Name + ':' + List.Desc;
				else NewStr = List.Name;

				qstrs.push(NewStr);
			}

			qstrs = qstrs.sort();

			return new qList(qstrs.join('|') + '|');
		}

		toSelect(Select: HTMLSelectElement) {
			let List = this.toQList();

			if (List) List.qToSelect (Select);
		}
	}

	//  ________________________________________________

	export class RsLoL extends LoL {
		FM = this.add('FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|');

		/*  Input Formats, defined by~FormatStr~

            FormatStr starts with first character which defines its nature,
            followed by additional characters in some cases

            # - number (including floating point)
            I - integer
            Onn - ordinal (+) integers, 0 allowed to indicate none (nn is limit if present)
            R - StartNumber  COMMA  EndNumber
            P - integer pair
            Ann - number array (COMMA separated)  (nn specifies size limit for array)
            {} - set of allowed strings inside brackets, choose one (or NONE)
            @ListName - choose member from named list
            $ - dollar amount, allows two digit cents included $$$.cc
            %nn - string limited to nn characters
            Unn - uppercase string
        */

		PL = this.add('|Number:#|String:$|ArrayBuffer:[|');

		FT = this.add(
			'Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|'); // added & tested full support for Num, Int, Str, Dollar, Nums, Range, Upper, Ord, Pair; Member Rough Support Added
		//
		CT = this.add('Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|');

		LT = this.add(
			'Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|'
		);

		DT = this.add(
			'Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|'
		);
		EV = this.add('Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|');
		RT = this.add('Rt:Return|Ok|Fail|Equal|Unequal|Queue|');
		TD = this.add('Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|');
		TS = this.add(
			'Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|'
		);
		// Note that Tile Alignment is probably same as Tile Size, at least for now!
		Pr = this.add('Pr:Process|Init|Read|Set|Clear|Default|');
		MT = this.add('Mt:MessageType|Input|Output|Event|Trigger|Action|');
		AC = this.add('Ac:Action|Init|Timer|Login|Logout|');
		LG = this.add('Lg:Language|En:English|Es:Espanol|Cn:Chinese|');
		CY = this.add('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
		Test = this.add('Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|');

		get cl () { return 'RSLoL'; }
	}

	export const CL = new RsLoL();
	const PL = CL.PL;

	export class LID {
		ListType: number;
		ID: number;
		Str: string = '';

		constructor(LT: number, ID1: number, Check = true) {
			this.ListType = LT;
			this.ID = ID1;

			if (Check) this.AsStr();
		}

		AsStr() {
			if (this.Str) return this.Str;
			if (!CL.Lists.length) return 'No Lists!';

			let RetStr = '';
			let Invalid = true;

			let ListVID = CL.FM.qGetVID (this.ListType);
			if (ListVID) {
				let List = CL.List (ListVID.Name);

				if (List) {
					let VID = List.qGetVID(this.ID);
					RetStr = ListVID.Name + ':' + ListVID.Desc;

					if (VID) {
						RetStr += ' = ' + VID.Name + ':' + VID.Desc;
						Invalid = false;
					} else RetStr += ' = Bad ID #' + this.ID.toString();
				} else RetStr = 'Cannot find Listname ' + ListVID.Name + ' # ' + ListVID.ID.toString;
			} else RetStr = 'Bad List #' + this.ListType.toString();

			if (Invalid) {
				RetStr = '@' + RetStr;
				this.ListType = 0 - this.ListType;
				this.ID = 0 - this.ID;
				// consider breakpoint or error here!
			}

			return (this.Str = RetStr);
		}
	} // LID

	//  _____________________________________

	export class ListEdit {
		MainList?: HTMLSelectElement;
		DropList?: HTMLSelectElement;
		ListSelect?: HTMLSelectElement;
		TileSelect?: HTMLSelectElement;

		MainSelectedID: number = 0;
		ListSelectedID: number = 0;

		NameEdit?: HTMLInputElement;
		FormatEdit?: HTMLInputElement;
		ValueEdit?: HTMLInputElement;
		DescEdit?: HTMLInputElement;
	}

	export const LstEdit = new ListEdit();
	let TL: TileList;

	export function BadTF(In: IOArgs): IOArgs {
		// Should raise exception!
		return undefined;
	}

	export class TFList {
		Names: string[] = [];
		Verts: DataVert[] = [];

		Bad = this.Add('Bad', BadTF);

		Add(Name: string, Vert: DataVert): DataVert | undefined {
			if (!Name || !Vert) return;

			let Pos = this.Names.indexOf(Name);
			if (Pos < 0) {
				this.Names.push(Name);
				this.Verts.push(Vert);
			} else this.Verts[Pos] = Vert;

			return Vert;
		}

		Del(Name: string) {
			let Pos = this.Names.indexOf(Name);
			if (Pos >= 0) {
				this.Names.splice(Pos, 1);
				this.Verts.splice(Pos, 1);
			}
		}
	}

	export const ToFroms = new TFList();

	export function ABfromArray (Source : Int8Array) : ArrayBuffer {
		let AB = new ArrayBuffer (Source.length);
		let Dest = new Int8Array (AB);
		Dest.set (Source);

		return AB;
	}

	export function bb2str(bbi : BBI) {
		return bbi ? new TextDecoder().decode(bbi) : '';
	  }

	export function ab2str(AB : ArrayBuffer) {
		return new TextDecoder().decode(AB);
	  }

	export function str2ab(Str : string) {
		return new TextEncoder().encode(Str);
	}

	export function str2bbi(Str : string) : UBuf {
		return new TextEncoder().encode(Str);
	}

	export function num2ab (N : number) : ArrayBuffer {
		if (N !== N)	//	NaN
			return NILAB;		

		let NewBuf = NILAB;		// default is NIL
		if (N % 1) {	// floating point
			NewBuf = new ArrayBuffer (8);
			let floats = new Float64Array (NewBuf);
			floats[0] = N;
			if (floats[0] !== N)
				console.log ('Float mismatch!');
			}
		else {
			let M = (N >= 0) ? N : -N;
			if (M < 128) {		// 1 byte
				NewBuf = new ArrayBuffer (1);
				let bytes = new Int8Array (NewBuf);
				bytes[0] = N;
				if (bytes[0] !== N)
					console.log ('Value mismatch!');

			}
			else if (M < 32000) {	// 2 byte
				NewBuf = new ArrayBuffer (2);
				let words = new Int16Array (NewBuf);
				words[0] = N;
				if (words[0] !== N)
					console.log ('Value mismatch!');
			}
			else if (M < 2000000000) { // 4 byte
				NewBuf = new ArrayBuffer (4);
				let longs = new Int32Array (NewBuf);
				longs[0] = N;
				if (longs[0] !== N)
					console.log ('Value mismatch!');
			}
			else { // need full float number size}
				NewBuf = new ArrayBuffer (8);
				let floats = new Float64Array (NewBuf);
				floats[0] = N;
				if (floats[0] !== N)
					console.log ('Value mismatch!');
			}
		}

		return NewBuf;
	}

	export function num2bb (N:number) : UBuf {
		let AB = num2ab (N);
		return new Uint8Array (AB);
	}

	export function ab2num (AB : ArrayBuffer) : number {
		let NBytes = AB.byteLength;
		let Num : number;

//		console.log ('  ab2num, ByteArray ' + NBytes.toString () + ' bytes = ' + bytes);

		switch (NBytes) {
			case 1 :
				let Bytes = new Int8Array (AB);
				Num = Bytes[0];
				break;
			case 2 :
				let Words = new Int16Array (AB);
				Num = Words[0];
				break;
			case 4 :
				let Longs = new Int32Array (AB);
				Num = Longs[0];
				break;
			case 8 :
				let Floats = new Float64Array (AB);
				Num = Floats[0];
				break;

			default : Num = NaN;
		}
		return Num;
	}

	export function ab2bb (AB : ArrayBuffer) {
		return newBuf (AB);
	}

	export function bb2ab (bbi : BBI) {
		if (bbi) {
			let newAB = new ArrayBuffer (bbi.byteLength);
			let newBBI = new Uint8Array (newAB);
			newBBI.set (bbi);
			return newAB;
		}
		return NILAB;
	}

	export function bb2num (buf : BBI) : number {
		if (buf) {
			let len = buf.length, AB = new ArrayBuffer (len), dest = new Uint8Array (AB);
			dest.set (buf,0);
			return ab2num (AB);
		}
		return NaN;
	}

	export type PFData=string|number|ArrayBuffer|BufPack|qList|RSData|undefined;

	export class PackField extends RSD {
		protected _name = '';
		protected _type=tNone;
		protected _data : any = NILAB;
		protected _error = '';
		protected _AB1 = NILAB;

		get notNIL () {
			return true;
		}

		copy (newName='') {
			let AB = this.toAB1;
			if (!newName)
				newName = this._name;
			return new PackField (newName, AB, this._type);
		}

		from (Src : PackField) {
			this._name = Src._name;
			this._type = Src._type;
			this.setByAB (Src.toAB1, this._type);
		}

		get Type () { return this._type; }
		get Name () { return this._name; }
		get Str () { return (this._type === tStr) ? this._data as string : ''; }
		get Num () { return (this._type === tNum) ? this._data as number : NaN; }

		get AB () {
			// return this._AB;
			return (this._AB1 !== NILAB) ? this._AB1 : this.toAB1;
		}

		fromDisk (Type:string) {
			if (this._type !== tDisk)
				return this._data;
			
			switch (Type) {



			}

			return NILAB;
		}

		get rawAB () {
			if ((this._type !== tAB)  ||  (this._data === NILAB))
				return NILAB;

			return this.AB;
		}

		get rawList () {
			let AB = this.rawAB;

			if (AB.byteLength  &&  AB !== NILAB) {
				let Str = ab2str (AB);

				if (Str)
					return new qList (Str);
			}

			return NILList;
		}

		get rawPack () {
			let AB = this.rawAB;

			if (AB.byteLength  &&  AB !== NILAB) {
				let Pack = new BufPack ();
				Pack.bufIn (AB);
				return Pack;
			}
			return NILPack;
		}

		get Pack () {
			switch (this._type)
			{
				case tPack :	return this._data ? this._data as BufPack : new BufPack ();
				case tAB :
					this._type = tPack;
					let Pack = new BufPack ();
					Pack.bufIn (this._data);
					this._data = Pack;
					return Pack;					
			}
			return NILPack;
		}


		get rsPack () { return (this._type == tData) ? this._data as BufPack : NILPack; }
		get List () {
			switch (this._type) {
				case tList :	return this._data ? this._data as qList : new qList ();
				case tAB : case tStr : 
					let Str = this._data;
					if (!Str)
						return new qList ();
					if (typeof (Str) !== 'string')
						Str = ab2str (Str);
					return new qList (Str);
			}
			return NILList;
		 }

		get Error () { return this._error; }

		setAB (AB:ArrayBuffer|null = NILAB) { 
			if (AB) 
				return this._AB1 = (AB === NILAB) ? this.toAB1 : AB as ArrayBuffer;
			else return this._AB1 = NILAB;
		}

		get toAB1 () : ArrayBuffer {
			let AB = this._AB1;
			if (AB !== NILAB)
				return AB;

			switch (this._type) {
				case tNum : AB = this._AB1 = num2ab (this._data as number); break;
				case tStr : AB = this._AB1 = str2ab (this._data as string).buffer; break;
				case tAB :  AB = (this._data as ArrayBuffer).slice (0);
					// console.log ('  toAB ' + this._name + '[=' + AB.byteLength.toString ());
					return AB;
				case tData : 
					if (this._data === NILData) {
						AB = NILAB;
						break;
					}
					let Pack = (this._data as RSData).SavePack ();
					AB = Pack.bufOut ();
					break;

				case tPack : AB = this.Pack.bufOut (); break;
				case tList : AB = str2ab ((this._data as qList).to$).buffer; break;
				default : AB = NILAB; this._error = 'toArray Error, Type =' + this._type + '.';
			}

			return AB;
		}

		setName (N:string) {
			if (this.notNIL  &&  !this._name)
				this._name = N;
		}

		setData (D : PFData) {
		    this.notNIL;
			this._AB1 = NILAB;

			let Type;
			switch (typeof (D)) {
				case 'number' : Type = tNum; break;
				case 'string' : Type = tStr; break;
				default :
					if (!D) {
						D = NILAB;
						Type = tAB;
					} else
					{
						let CName = D.constructor.name;
						switch (CName) {
							case 'BufPack' :
								Type = tPack;
								D = (D as BufPack).copy;
								break;
							case 'vList' :
								Type = tList;
								D = new qList ((D as qList).to$);
								break;
							case 'ArrayBuffer' :
								Type = tAB;
								D = this.setAB ((D as ArrayBuffer)).slice (0);
								break;
							case 'Buffer' :
								Type = tAB;
								let TBuf = (D as unknown as Int8Array).slice(0);
								D = this.setAB (ABfromArray (TBuf));
								break;
							default :
								if (D instanceof RSData) {
									Type = tData;
									D = (D as RSData).SavePack ();
									log ('setData:Not allowed without TypeLists, field='+this._name);
									// we cannot directly create the appropriate
									// RSData record because we don't have TypeLists
									// fully implemented
								}
								else
									throw ('tNone! Name =' + this._name + ' CName=' + CName);
									Type = tNone;
									this._data = NILAB;
								}
						}
			}
			this._type = Type;
			this._data = D;
			return this.setAB ();
		}

		get clear () {
			let D : any;
			this._AB1 = NILAB;
			
			switch (this._type) {
				case tNum : D = NaN; break;
				case tStr : D = ''; break;
				case tPack : D = new BufPack (); break;
				case tAB : D = new ArrayBuffer (0); break;
				case tList : D = new qList (''); break;
				default : 
					D = NILAB;
			}
			this._data = D;
			this.setAB ();
			return true;
		}


		private setByAB (AB : ArrayBuffer,Type1 : string) {
		    this.notNIL;
			this._AB1 = NILAB;

			let D;
			switch (Type1) {
				case tNum : D = ab2num (AB); break;

				case tStr : D = ab2str (AB); break;
				case tPack : case tData :
					let Pack = new BufPack (); Pack.bufIn (AB);
					D = Pack;
					if (Type1 === tData)
						console.log ('setByAB: type = ' + Type1 + ' Not allowed without TypeLists, field='+this._name);
					// currently we cannot support tData by creating
					// the appropriate RSData record because we don't
					// have TypeLists fully implemented (Name/new/EditFunc)
					break;
				case tAB : D = AB.slice (0); break;
				case tList : D = new qList (ab2str (AB)); break;
				default : this._error = 'constructor error Type =' + Type1 + ', converted to NILAB.';
					Type1 = tAB;
					D = NILAB;
					AB = NILAB;
					break;
			}

			this._data = D;
			this._type = Type1;
			return this.setAB ();
		}

		private _setByBuf (Type : string, InBuffer : Int8Array | ArrayBuffer, Start = -1, nBytes = -1) {
		    this.notNIL;

			let ABuf : ArrayBuffer;
			let IBuf,TBuf : Int8Array;

			if (Start < 0) {
				Start = 0; nBytes = 999999999;
			}
			else if (nBytes < 0)
				nBytes = 999999999;

			let CName = InBuffer.constructor.name;
			if (CName === 'ArrayBuffer') {
				ABuf = (InBuffer as ArrayBuffer).slice (Start, Start + nBytes);
				IBuf = new Int8Array (ABuf);
			}
			else {	// Int8Array
				TBuf = (InBuffer as Int8Array).slice (Start, Start+nBytes);
				ABuf = ABfromArray (TBuf);
			}

			this.setByAB (ABuf, Type);
		}

		constructor (N : string, D : PFData,Type1='') {
			super ();
			this._name = N;

			if (Type1)		// AB coming in with type
				this.setByAB (D as ArrayBuffer, Type1);
			else this.setData (D);
		}

		get NameVal () {
			let Str = this._type + this._name + '=';

			switch (this._type) {
				case tNum : Str += this.Num.toString (); break;
				case tStr : Str += this.Str; break;
				case tList : let L = this.List;
					Str += 'LIST=' + L.Name + ' Desc:' + L.Desc;
					break;
				case tPack : case tData : case tAB :
					 Str += '(' ;
					 if (this._type === tAB) {
							Str += this._AB1.byteLength.toString () + ')';
							break;
					 }

					let Pack = this.Pack;

					Str += 'C:'+Pack.fetch('<').length.toString() + ' D:' + Pack.fetch('>').length.toString () + ')';
					break;

				default : Str += 'BADTYPE=' + this._type + ' ' + this.AB.byteLength.toString () + ' bytes';
			}

			return Str;
		}


		Equal (Ref : PackField) : boolean {
		    this.notNIL;

			if (this._type === Ref._type) {
				switch (this._type) {
					case tNum : return this.Num === Ref.Num;
					case tStr : return this.Str === Ref.Str;
					case tAB :
						let limit = this._AB1.byteLength;
						if (Ref._AB1.byteLength != limit)
							return false;

						let B = newBuf (this._AB1);
						let R = newBuf (Ref._AB1);

						for (let i = limit; --i >= 0;) {
							if (B[i] !== R[i])
								return false;
						}
						return true;	// no mismatch, equal.
					default : return false;
				}
			}
			return false;
		}

		get desc() {
			let Str = this.NameVal + ' ';

			switch (this._type) {
				case tNum : break; // Str += '= ' + this._num.toString (); break;
				case tStr : break; // Str += '= ' + this._str; break;
				case tList : break;
				case tPack : case tData :  
					let Pack = this.Pack;
					let Ds = Pack.fetch('>');
					for (const F of Ds)
						Str += ' ' + F.NameVal;
					break;
				case tAB : break;

				default : Str += ' DEFAULT AB, Type =' + this._type + ' ' + this._AB1.byteLength.toString () + ' bytes'; break;
			}

			if (this._error)
				Str += ' ***ERROR*** ' + this._error;

			return Str;
		}
	}

	export class RSField extends qList {
		protected _name = '';
		protected _type=tNone;
		protected _con='';
		protected _data : any = NILAB;
		protected _array=false;
		protected _arrDims:Int32Array|undefined;
		protected _pFormat:string|undefined;
		protected _prefix='';
		protected _dim=0;
		protected _AB1=NILAB;

		get cl () { return 'RSField'; }

		getType () {
			this.clear;

			let D = this._data, arrayStr='';
			if (!D) {
				return this._type = tNone;
			}

			let str='', cName = D.constructor.name;
			switch (cName) {
				case 'Number' : case 'String' : 
					this._type = (cName === 'String') ? tStr : tNum;
					break;

				case 'Array' :
					let Arr = D as Array<any>, aType;
					for (const E of Arr) {
						if (E) {
							cName = E.constructor.name;
							if (cName === 'Number')
								aType = tNum;
							else if (cName === 'String')
								aType = tStr;
							else {
								this._con = cName;
								aType = tRSD;
							}
							this._type = aType;
							this._array=true;
							break;
						}
					}
					arrayStr = tArrayStr;
					break;

				default : // non Array object, must be RSD object
					this._con = cName;
					this._type = tRSD;
			}	// switch

			this._pFormat = ',' + this._type + '[]' + this._name + ':';
			return this._type;
		}

		get clear () {
			super.clear;

			this._name = '';
			this._type=tNone;
			this._con='';
			this._data=NILAB;
			this._array=false;
			this._arrDims=undefined;
			this._pFormat=undefined;
			this._dim = 0;
			this._AB1=NILAB;

			return true;
		}

		fromPrefix (pStr:string,RSDName='') {
			this.clear;
//			this._prefix = ',' + this._type + arrayStr + this._name + tDimStr;
			let arrayStr, nameStr, dimStr, array=false, con='', Dims;

			if (!pStr  ||  (pStr[0] !== ','))
				return;

			if (pStr[2] === '[') {	// arrayStr is present!
				let close = pStr.indexOf(']'), dim=0;
				if (close < 0)
					return;		// panic, no close

				array = true;

				nameStr = pStr.slice (close + 1);
				let aStr = pStr.slice (3,close);
				if (aStr) {
					let Strs = aStr.split (' '), cNameStr = Strs[0];
					if (Strs.length > 1)
						this._array = true;

					if (cNameStr) {
						if (cNameStr[0] === ':')
							this._con = cNameStr.slice (1);
						else this._con = cNameStr;
					}

					Dims = new Int32Array (Strs.length-1);
					let count = 0;
					for (const S of Strs) {
						if (count++)
							Dims[count-1] = Number (S);
					}
				}
			}
			else nameStr = pStr.slice (2);

			let colon = nameStr.indexOf(':');
			if (colon < 0)
				return;

			dimStr = nameStr.slice (colon + 1);
			let dim = Number (dimStr);
			if (dim &&  dim >= 0)
				this._dim = dim
			else return;

			this._name = nameStr.slice (0,colon);
			this._type = pStr[1];
			this._con = con;
			this._array = array;
			if (Dims)
				this._arrDims = Dims;
		}

		get toAB () : ArrayBuffer|undefined {
			let prefix, pre = this._pFormat;
			if (pre)
				prefix = pre as string;
			else {
				this.getType;
				if (pre = this._pFormat)
					prefix = pre as string;
				else return undefined;
			}

			return NILAB;
		}

//			this._prefix = ',' + this._type + arrayStr + this._name + tDimStr;





//			this._prefix = ',' + this._type + arrayStr + this._name + tDimStr;


/*
					if (cName !== 'Array') {	// RSD single record


					}
					else {
						let Arr = D as Array<any>, aType, dimStr='', let arrayStr='';
						for (const E of Arr)
							if (E  &&  !aType) {
								aType = E.constructor.name;
								if (aType === 'Number')
									aType = tNum;
								else if (aType === 'String')
									aType = tStr;
								else aType = tRSD;
								this._arrType = aType;
								break;
							}
		
		
		
		
						else if (this._type === tNum) {
							AB = new ArrayBuffer(Arr.length*8);
							let floats = new Float64Array (AB);
							floats.set (Arr);
							arrayStr = '[]';
						}
						else if (this._type === tStr) {
							let newStrs:string[] = [], nBytes = 0, count = 0;
							arrayStr = '[';
							for (const E of Arr) {
								++count;
								let len = E ? E.length : 0;
								if (len) {
									newStrs.push (E);
									nBytes += len;
								}
								dimStr += ' ' + len.toString ();
							}
							arrayStr += ']';
							let newStr = newStrs.join ('');
							AB = str2ab (newStr);
						}
					}


					break;
				default : return;
			}
/*

			//			export const tNone='',tStr='$',tNum='#',tAB='(',tPack='&',tList='@',tData='^',tRSD='+',tDisk='*',tArray='[';
						str = ',' + this._type;
						if (this._arrType) {
							let Arr = this._data as Array<any>, aType;
							if (this._type[0] >= '0') {	// RSD derived
								for (const E of Arr)
									if (E) {
										if (!aType)
											aType = E.constructor.name + '=';
									}
			
			
			
			
							}
							else if (this._type === tNum) {
								AB = new ArrayBuffer(Arr.length*8);
								let floats = new Float64Array (AB);
								floats.set (Arr);
								arrayStr = '[]';
							}
							else if (this._type === tStr) {
								let newStrs:string[] = [], nBytes = 0, count = 0;
								arrayStr = '[';
								for (const E of Arr) {
									++count;
									let len = E ? E.length : 0;
									if (len) {
										newStrs.push (E);
										nBytes += len;
									}
									str += ' ' + len.toString ();
								}
								arrayStr += ']';
								let newStr = newStrs.join ('');
								AB = str2ab (newStr);
							}
						}
			
						str += arrayStr + this._name + ':' + AB?.byteLength.toString();
						return str;



			return this._type;
		}
*/
		getPrefix () {
			if (this._pFormat)
				return this._pFormat as string;




			return this._pFormat as string;
		}

		get prefixStr () { 
			if (this._pFormat)
				return this._pFormat;


		}

		get Name () { return this._name; }
		set Name (s:string) { 
			this._name = s;
			this.qSet ('Name',s);
		}

		get Type () { return this._type; }
		set Type (s:string) { 
			this._type = s;
			this.qSet ('Type',s);
		}

		get _AB () {
			if (this._AB1  &&  this._AB1 !== NILAB)
				return this._AB1;

			return this.toAB1;
		}

		set _AB (AB:ArrayBuffer) {
			this._AB1 = AB ? AB : NILAB;
		}

		copyField (newName='') {
			let AB = this.toAB1;
			if (!newName)
				newName = this._name;
			return new PackField (newName, AB, this._type);
		}

		from (Src : RSField) {
			this._name = Src._name;
			this._type = Src._type;
			this.setByAB (Src.toAB1, this._type);
		}

		setD (D : any, name='',elname='') {
			if (D)
				this._data = D
			else D = this._data;

			this.getType;	// based on D value

			if (name)
				this._name = name;
			if (!this._con  &&  elname)
				this._con = elname;
		}


/*
		get toAB () {
			let str = ',' + this._type, arrayStr='',AB;
			if (this._arrType) {
				let Arr = this._data as Array<any>, aType;
				if (this._type[0] >= '0') {	// RSD derived
					for (const E of Arr)
						if (E) {
							if (!aType)
								aType = E.constructor.name + '=';
						}




				}
				else if (this._type === tNum) {
					AB = new ArrayBuffer(Arr.length*8);
					let floats = new Float64Array (AB);
					floats.set (Arr);
					arrayStr = '[]';
				}
				else if (this._type === tStr) {
					let newStrs:string[] = [], nBytes = 0, count = 0;
					arrayStr = '[';
					for (const E of Arr) {
						++count;
						let len = E ? E.length : 0;
						if (len) {
							newStrs.push (E);
							nBytes += len;
						}
						str += ' ' + len.toString ();
					}
					arrayStr += ']';
					let newStr = newStrs.join ('');
					AB = str2ab (newStr);
				}
			}

			str += arrayStr + this._name + ':' + AB?.byteLength.toString();
			return str;
		}
*/

		get Str () { return (this._type === tStr) ? this._data as string : ''; }
		get Num () { return (this._type === tNum) ? this._data as number : NaN; }

		/*
		get AB () {
			// return this._AB;
			return (this._AB1 !== NILAB) ? this._AB1 : this.toAB1;
		}
		*/

		fromDisk (Type:string) {
			if (this._type !== tDisk)
				return this._data;
			
			switch (Type) {



			}

			return NILAB;
		}

		get rawAB () {
			if ((this._type !== tAB)  ||  (this._data === NILAB))
				return NILAB;

			return this._AB ? this._AB : NILAB;
		}

		get rawList () {
			let AB = this.rawAB;

			if (AB.byteLength  &&  AB !== NILAB) {
				let Str = ab2str (AB);

				if (Str)
					return new qList (Str);
			}

			return NILList;
		}

		get rawPack () {
			let AB = this.rawAB;

			if (AB.byteLength  &&  AB !== NILAB) {
				let Pack = new BufPack ();
				Pack.bufIn (AB);
				return Pack;
			}
			return NILPack;
		}

		get Pack () {
			switch (this._type)
			{
				case tPack :	return this._data ? this._data as BufPack : new BufPack ();
				case tAB :
					this._type = tPack;
					let Pack = new BufPack ();
					Pack.bufIn (this._data);
					this._data = Pack;
					return Pack;					
			}
			return NILPack;
		}


		get rsPack () { return (this._type == tData) ? this._data as BufPack : NILPack; }
		get List () {
			switch (this._type) {
				case tList :	return this._data ? this._data as qList : new qList ();
				case tAB : case tStr : 
					let Str = this._data;
					if (!Str)
						return new qList ();
					if (typeof (Str) !== 'string')
						Str = ab2str (Str);
					return new qList (Str);
			}
			return NILList;
		 }

		get Error () { return this.qDescByName ('Error'); }

		setAB (AB:ArrayBuffer|null = NILAB) { 
			if (AB) 
				return this._AB1 = (AB === NILAB) ? this.toAB1 : AB as ArrayBuffer;
			else return this._AB1 = NILAB;
		}

		get toAB1 () {
			let AB = this._AB1;
			if (AB !== NILAB)
				return AB;

			switch (this._type) {
				case tNum : AB = this._AB1 = num2ab (this._data as number); break;
				case tStr : AB = this._AB1 = str2ab (this._data as string).buffer; break;
				case tAB :  AB = (this._data as ArrayBuffer).slice (0);
					// console.log ('  toAB ' + this._name + '[=' + AB.byteLength.toString ());
					return AB;
				case tData : 
					if (this._data === NILData) {
						AB = NILAB;
						break;
					}
					let Pack = (this._data as RSData).SavePack ();
					AB = Pack.bufOut ();
					break;

				case tPack : AB = this.Pack.bufOut (); break;
				case tList : AB = str2ab ((this._data as qList).to$).buffer; break;
				default : AB = NILAB; this.qSet ('Error','toArray Error, Type =' + this._type + '.');
			}

			return AB;
		}

		setData (D : PFData) {
			if (!D) {
				this._data = NILAB;
				this._type = tAB;
				return;
			}

			this._AB1 = NILAB;

			let Type;
			switch (typeof (D)) {
				case 'number' : Type = tNum; break;
				case 'string' : Type = tStr; break;
				default :
					let CName = D.constructor.name;
					switch (CName) {
						case 'BufPack' :
							Type = tPack;
							D = (D as BufPack).copy;
							break;
						case 'vList' :
							Type = tList;
							D = new qList ((D as qList).to$);
							break;
						case 'ArrayBuffer' :
							Type = tAB;
							D = this.setAB ((D as ArrayBuffer)).slice (0);
							break;
						case 'Buffer' :
							Type = tAB;
							let TBuf = (D as unknown as  Int8Array).slice(0);
							D = this.setAB (ABfromArray (TBuf));
							break;
						default :
							if (D instanceof RSData) {
								Type = tData;
								D = (D as RSData).SavePack ();
								log ('setData:Not allowed without TypeLists, field='+this._name);
								// we cannot directly create the appropriate
								// RSData record because we don't have TypeLists
								// fully implemented
							}
							else
								throw ('tNone! Name =' + this._name + ' CName=' + CName);
								Type = tNone;
								this._data = NILAB;
							}
			}
			this._type = Type;
			this._data = D;
			return this.setAB ();
		}

		get clearData () {
			let D : any;
			this._AB1 = NILAB;
			
			switch (this._type) {
				case tNum : D = NaN; break;
				case tStr : D = ''; break;
				case tAB : D = new ArrayBuffer (0); break;
				default : 
					D = NILAB;
			}
			this._data = D;
			this.setAB ();
			return true;
		}


		private setByAB (AB : ArrayBuffer,Type1 : string) {
			this._AB1 = NILAB;

			let D;
			switch (Type1) {
				case tNum : D = ab2num (AB); break;

				case tStr : D = ab2str (AB); break;
				case tPack : case tData :
					let Pack = new BufPack (); Pack.bufIn (AB);
					D = Pack;
					if (Type1 === tData)
						console.log ('setByAB: type = ' + Type1 + ' Not allowed without TypeLists, field='+this._name);
					// currently we cannot support tData by creating
					// the appropriate RSData record because we don't
					// have TypeLists fully implemented (Name/new/EditFunc)
					break;
				case tAB : D = AB.slice (0); break;
				case tList : D = new qList (ab2str (AB)); break;
				default : this.qSet ('Error','constructor error Type =' + Type1 + ', converted to NILAB.');
					Type1 = tAB;
					D = NILAB;
					AB = NILAB;
					break;
			}

			this._data = D;
			this._type = Type1;
			return this.setAB ();
		}

		private _setByBuf (Type : string, InBuffer : Int8Array | ArrayBuffer, Start = -1, nBytes = -1) {
			let ABuf : ArrayBuffer;
			let IBuf,TBuf : Int8Array;

			if (Start < 0) {
				Start = 0; nBytes = 999999999;
			}
			else if (nBytes < 0)
				nBytes = 999999999;

			let CName = InBuffer.constructor.name;
			if (CName === 'ArrayBuffer') {
				ABuf = (InBuffer as ArrayBuffer).slice (Start, Start + nBytes);
				IBuf = new Int8Array (ABuf);
			}
			else {	// Int8Array
				TBuf = (InBuffer as Int8Array).slice (Start, Start+nBytes);
				ABuf = ABfromArray (TBuf);
			}

			this.setByAB (ABuf, Type);
		}

		constructor (N : string, D : PFData,Type1='') {
			super ();
			this._name = N;

			if (Type1)		// AB coming in with type
				this.setByAB (D as ArrayBuffer, Type1);
			else this.setData (D);
		}

		get NameVal () {
			let Str = this._type + this._name + '=';

			switch (this._type) {
				case tNum : Str += this.Num.toString (); break;
				case tStr : Str += this.Str; break;
				case tList : let L = this.List;
					Str += 'LIST=' + L.Name + ' Desc:' + L.Desc;
					break;
				case tPack : case tData : case tAB :
					 Str += '(' ;
					 if (this._type === tAB) {
							Str += this._AB1.byteLength.toString () + ')';
							break;
					 }

					let Pack = this.Pack;

					Str += 'C:'+Pack.fetch('<').length.toString() + ' D:' + Pack.fetch('>').length.toString () + ')';
					break;

				default :
					let AB = this._AB;
					if (!AB)
						AB = NILAB;
					Str += 'BADTYPE=' + this._type + ' ' + AB.byteLength.toString () + ' bytes';
			}

			return Str;
		}


		Equal (Ref : RSField) : boolean {
			if (this._type === Ref._type) {
				switch (this._type) {
					case tNum : return this.Num === Ref.Num;
					case tStr : return this.Str === Ref.Str;
					case tAB :
						let limit = this._AB1.byteLength;
						if (Ref._AB1.byteLength != limit)
							return false;

						let B = newBuf (this._AB1);
						let R = newBuf (Ref._AB1);

						for (let i = limit; --i >= 0;) {
							if (B[i] !== R[i])
								return false;
						}
						return true;	// no mismatch, equal.
					default : return false;
				}
			}
			return false;
		}

		get desc() {
			let Str = this.NameVal + ' ';

			switch (this._type) {
				case tNum : break; // Str += '= ' + this._num.toString (); break;
				case tStr : break; // Str += '= ' + this._str; break;
				case tList : break;
				case tPack : case tData :  
					let Pack = this.Pack;
					let Ds = Pack.fetch('>');
					for (const F of Ds)
						Str += ' ' + F.NameVal;
					break;
				case tAB : break;

				default : Str += ' DEFAULT AB, Type =' + this._type + ' ' + this._AB1.byteLength.toString () + ' bytes'; break;
			}

			if (this.Error)
				Str += ' ***ERROR*** ' + this.Error;

			return Str;
		}
	}


	export class RSPack extends RSMom {
		RSDName='';
		KidName='';
		prefix='';
		
		get cl () { return 'RSPack'; }

		get Fields () {
			return this.K ? this.K.Kids as RSF[] : [];
		}

		addField (F : RSF, replace=false) {
			let k = this.K;

			if (k) 
				k.add (F,replace);
		}

		add (Args:Array<any>) {
			let k = this.K, len = Args.length, i = 0;

			if (!k)
				return;

			if (len & 1)
				throw 'Must add Name:Data Pairs!';

			while (i < len) {
				k.add (new RSField (Args[i] as string,Args[i+1]));
				i += 2;
			}
		}

		addData (data:RSFldData, name='', conName = '') {
			let Field = new RSF ();

			Field.setData (data,conName);
			if (name)
				Field.setName (name);

			this.addField (Field);
			return Field;
		}

		toBuf (RSDName='') {
			let k = this.K, Kids, nBytes = 0, count = 0;
			if (k)
				Kids = k._kids;
			else return undefined;

			let first = this.RSDName + (this.KidName ? (':' + this.KidName) : '');
			let prefixes = [first];

			for (const F of Kids) {
				if (F) {
					prefixes.push (F.toPrefix (this.RSDName));
					++count;

					if (F._bbi)
						nBytes += F._bbi.byteLength;
				}
			}
			prefixes.push (StrEndBlk);

			this.prefix = prefixes.join (',');
			let prefixBuf = str2bbi (this.prefix), buf = newBuf (nBytes + prefixBuf.byteLength),
					offset = prefixBuf.byteLength;
			buf.set (prefixBuf,0);

			prefixes = prefixes.slice (1,-1);
			
			let Bufs = Array<BBI> (count);
			let i = 0;
			for (const F of Kids) {
				if (F) {
					Bufs[i++] = F._bbi;
					if (F._bbi  &&  F._bbi.byteLength) {
						buf.set (F._bbi, offset);
						offset += F._bbi.byteLength;
					}
				}
			}

			if (offset !== buf.byteLength)
				throw "Buf length mismatch!";

			return this._bbi = buf;
		}

		fromBBI (buf : BBI, RSDName='') {
			if (!buf)
				return;

			if (!RSDName)
				RSDName = this.RSDName;

			let end = buf.indexOf (StrEndBlkCode), k = this.K;
			if (!k  ||  (end < 0))
				return;

			let offset = end + 1, str = bb2str (buf.slice (0,end));
			this.prefix = str;
			let prefixes = str.split (',');
			let first = prefixes[0];
			prefixes = prefixes.slice (1,-1);
							
			let colon = first.indexOf (':');
			if (colon >= 0) {
				this.RSDName = first.slice (0,colon);
				this.KidName = first.slice (colon + 1);
			}
			else this.RSDName = first;

			let count = prefixes.length, 
				Fields = Array<RSF> (count), i = 0;

			for (const P of prefixes) {
				let nBytes = prefixBytes (P), bbi;
				if (nBytes)
					bbi = buf.slice (offset,nBytes);

				let F = new RSF ();
				F.fromPrefix (P,bbi);
				Fields[i++] = F;
			}

			this._bbi = buf;

			k.setKids (Fields);
		}

		fromFields (Fields:RSF[], RSDName='', KidName='') {
			let k = this.K;
			if (k)
				k.setKids (Fields);

			this.RSDName = RSDName;
			this.KidName = KidName;
			return this.toBuf;
		}
	}

	export class BufPack {
		_type = '';
		_details = '';
		_ABLimit = 100;

		Cs : PackField[] = [];
		Ds : PackField[] = [];

		get size () {	// > 0 indicates field count, 0 - empty, -1 = no fields but not null
			let S = this.Cs.length + this.Ds.length;

			if (S)
				return S;

			return (this._type  ||  this._details) ? -1 : 0;
		}

		get notNIL () {
			if (this === NILPack) {
			   log ('NILPack!'); return false;
		   }
		   return true;
		}

		get Type() { return this._type; }
		get Details () { return this._details; }

		get info () {
			let Fields = this.Cs.concat (this.Ds);

			let Str = 'PACK';
			if (this._type)
				Str += ' Type:' + this._type;
			if (this.Details)
				Str += ' Details:' + this.Details;

			for (const Q of Fields)
				Str += ' ' + Q.Name;
			return Str;
		}

		fetch (Name='') : PackField[] {
			// Name = '' (ALL), Name = 'ABC_' ALL with ABC prefix,
			// Name = '_xyz' ALL with xyz suffix
			// Name = '>', ALL Ds  '<' ALL Cs

			if (!Name)
				return this.Cs.concat (this.Ds);

			let Fields=[], len = Name.length;
			switch (Name[0]) {
				case '_' :	// all with suffix
					Name = Name.slice(1);
					len = Name.length;
					for (const F of this.Ds) {
						if (F.Name.slice (len) === Name)
							Fields.push (F);
						}
					return Fields;

				case '>' : return this.Ds.slice (0);
				case '<' : return this.Cs.slice (0);
				default : 
						if (Name.slice(-1) !== '_')
							return [];
						else Name = Name.slice (0,--len);

						for (const F of this.Ds) {
							if (F.Name.slice (0,len) === Name)
								Fields.push (F);
						}
						return Fields;
			}
		}

		getField(Name: string): PackField|null {
			if (!Name)
				return null;

			let Fs = (Name >= '0') ? this.Ds : this.Cs;

			for (const F of Fs) {
				if (F.Name === Name)
					return F;
			}

			return null;
		}

		pushField (F:PackField) {
			let N=F.Name;
			if (!N  || (N >= '0'))
				this.Ds.push (F);
			else this.Cs.push (F);
		}

		addField (F:PackField) {
			if (this === NILPack)
				return;
			
			let Name = F.Name;
			let Fs = (!Name  || (Name >= '0')) ? this.Ds : this.Cs;

			let Found = this.getField (Name);
			if (Found) {
				let index = Fs.indexOf (Found);
				if (index >= 0) {
					console.log ('AddField, Replacing ' + Fs[index].desc + ' with ' + F.desc);
					Fs[index] = F;
					return false;
				}
				throw 'Cannot find twice!';
				return false;
			}

			Fs.push (F);
			return true;	// added field
		}

		delField (F:PackField|string|null) {
			if (!F)
				return false;

			let Field = ((typeof F) === 'string') ? this.getField(F as string) : F as PackField;

			if (!Field)
				return false;

			let index = this.Cs.indexOf (Field);
			if (index >= 0) {
				this.Cs.splice (index,1);
				return true;
			}
			if ((index = this.Ds.indexOf (Field)) >= 0) {
				this.Ds.splice (index,1);
				return true;
			}

			return false;
		}

		addArgs(Args: any[]) {
		    this.notNIL;

			let limit = Args.length;
			let NotNull = this.Cs.length || this.Ds.length;

		    this.notNIL;

			// console.log ('BufPack.add');

			if (Args.length & 1)
				return;		// must always be matching pairs (Name/Data), odd params not allowed

			for (let i = 0; i < limit; )
			{
				let FldName = Args[i++] as string;
				let Data = Args[i++];
				// console.log ('  PackField ' + FldName + '=' + Data);
				let NewField = new PackField(FldName,Data);

				if (NotNull)
					this.addField (NewField);
				else this.pushField (NewField);
			}
		}

		packData (Data : any[]) {
			for (const D of Data) {
				this.Ds.push (new PackField ('',D));
			}
		}

		constructor(_type = '', _Details = '', Args : any[]=[]) {
			this._details = _Details;

			this._type = _type;
			//	console.log ('constructor SetType =' + _type);

			let BPos = _Details.indexOf(']');
			if (BPos > 0) _Details = _Details.slice(0, BPos);
			// trim ] and trailing text to avoid errors

			if (Args.length)
				this.addArgs (Args);
		}

		xAdd (Type:string,Value:string|number) {
		    this.notNIL;

			let F = new PackField ('!'+Type,Value);

			if (this.Cs.length)	{
				let Old = this.Cs[0];
				this.Cs[0] = F;
				this.Cs.push (Old);
			}
			else this.Cs.push (F);
		}

		get xField () {
			if (this.Cs.length)
			{
				let F = this.Cs[0];
				if (F.Name[0] === '!')
					return F;
			}

			return null;
		}

		toABs1 ()
		{
		    this.notNIL;
			let Fields = this.Cs.concat (this.Ds);

			for (const F of Fields)
				F.setAB (F.toAB1);
		}

		update (N : string, V : any){
		    this.notNIL;

			let i;
			let Fs = ((N[0] < '0') || !N) ? this.Ds : this.Cs;
			for (i = Fs.length; --i >= 0;) {
					if (Fs[i].Name === N) {
						Fs[i] = new PackField (N,V);
						return true;
					}
				}

			return false;	// not found, no change
		}


		data1(Name: string): PFData {
			let F = this.getField(Name);
			return F ? F.Data : NILAB;
		}

		fData(Name: string): PFData {
			let F = this.getField(Name);
			return F  ? F.Data : NILAB;
		}

		str1(Name: string) {
			let F = this.getField(Name);
			return F ? F.Str : '';
		}

		fStr(Name: string) {
			let F = this.getField(Name);
			return F ? F.Str : '';
		}

		num1(Name: string) {
			let F = this.getField(Name);
			return F ? F.Num : NaN;
		}

		fNum(Name: string) {
			let F = this.getField(Name);
			return F ? F.Num : NaN;
		}

		list1 (Name: string) {
			let F = this.getField(Name);
			return F ? F.List : NILList;
		}

		fList (Name: string) {
			let F = this.getField(Name);
			return F ? F.List : NILList;
		}

		pack1 (Name: string) {
			let F = this.getField(Name);
			return F ? F.Pack : NILPack;
		}

		fPack (Name: string) {
			let F = this.getField(Name);
			return F ? F.Pack : NILPack;
		}

		get desc() {
			let Lines = [];
			let Pref = this.getPrefix ();
			let Fields = this.Cs.concat (this.Ds);
			let nFields = Fields.length;

			let Str = this.info;
			Lines.push(Str);

			for (const F of this.Cs) {
				Lines.push ('  C::' + F.desc);
				}
			for (const F of this.Ds) {
					Lines.push ('  D::' + F.desc);
			}

			if (this === NILPack)
				return 'NILPack!'
	
			return Lines.join('\n');
		}

		get expand () {
			if (!this.multi)
				return this.desc + '\n';

			let Lines = [];
			Lines.push (this.desc + '\n\n ** Expanded views of each record **' + this.Ds.length.toString () + 'n');

			let count = 0;
			for (const D of this.Ds) {
				let BP = new BufPack ();
				BP.bufIn (D.AB);
				Lines.push ('----- Record ' + (++count).toString () + '\n' + BP.desc);
			}

			return Lines.join ('\n');
		}

		private getPrefix(): string {
			let PFs = this.Cs.concat (this.Ds);

			let Prefix = '    ';
			if (this._type) {
				Prefix += ':' + this._type;
				if (this.Details)
					Prefix += '[' + this.Details + ']';
			}
			//	console.log ('Building Prefix, Type = ' + this.Type1 + ', starting as:' + Prefix);

			for (let PF of PFs) {
				//	console.log ('  Prefix add Name ' + PF.Name + ' Type ' + PF.Type + ' Size ' + PF.Size.toString ());
				Prefix += ',' + PF.Type + PF.Name + ':' + PF.AB.byteLength.toString();
			}
			return Prefix;
		}

		bufOut (): ArrayBuffer {
			if (this === NILPack)
				return NILAB;

			let Prefix = this.getPrefix();
			let PAB = str2ab (Prefix);
			let Bytes = PAB.byteLength;
			let ByteStr = Bytes.toString ();
			if (PAB.byteLength != Prefix.length)
				log ('*******mismatch!');
			Prefix = ByteStr + Prefix.slice (ByteStr.length);

			PAB = str2ab (Prefix);

			let Fields = this.Cs.concat (this.Ds);
			let limit = Fields.length;

			for (let F of Fields)
				Bytes += F.AB.byteLength;

			let AB = new ArrayBuffer (Bytes);

			let BA = newBuf (AB);
			BA.set (PAB);
			let Pos = PAB.byteLength;
			let Str = '  BufOut, fields=';

			for (let F of Fields) {
				Str += ' ' + F.desc;
				BA.set (new Uint8Array (F.AB), Pos);
				Pos += F.AB.byteLength;
			}

			if (Bytes < PAB.byteLength)
				throw 'BufOUT';

			return AB;
		}

		get copy () {
			let AB = this.bufOut ();
			let NewBP = new BufPack ();
			NewBP.bufIn (AB);
			return NewBP;
		}

		static ByteArray (nBytes : number) {
			let Bytes = newBuf (nBytes);

			let i = 0;
			for (var B of Bytes)
				B = i++  &  255;

			return Bytes;
		}

		bufIn (AB: ArrayBuffer) {
			this.notNIL;

			this.clear ();

			if (!AB  ||  (AB === NILAB)  ||  !AB.byteLength)
				return;

			let BA = newBuf (AB);

			let NumBuf = AB.slice (0, 8);
			let PStr = ab2str (NumBuf).slice (0,4);
			let PBytes = Number (PStr);
			let Num;

			let PBuf = BA.slice (0,PBytes);
			let Prefix = ab2str (PBuf.buffer);

			let NPos = 4;
			let Type = '';
			let Details = '';

			//	console.log ('BufIn, Prefix =' + Prefix + '.');
			if (Prefix[4] === ':') {
				Type = Prefix.slice(5);
				let C0 = Type.indexOf(',');
				if (C0 < 0) {
					console.log ('No fields present, we are done.\n');	
					return; // no fields present, done
				}

				let B0 = Type.indexOf('[');
				if (B0 >= 0 && B0 < C0) {
					// found details
					let B1 = Type.indexOf(']');
					if (B1 < 0) {
						console.log ('Tragic error, no terminating ]\n');
						return; // tragic error
					}
					Details = Type.slice(B0 + 1, B1);
					Type = Type.slice(0, B0).trimEnd();
					NPos = B1 + 4;
				}
				Type = Type.slice (0,C0);
			}
			this._type = Type;
			// console.log ('1.Type1 set to ' + Type)
			this._details = Details;

			let Offset = PBytes;

			let TPos;
			let SPos;
			let EndPos;
			let Name;
			let DBuf;
			let nBytes;

			while ((NPos = Prefix.indexOf(',', NPos)) > 0) {
				if ((SPos = Prefix.indexOf(':', ++NPos)) > 0) {
					Type = Prefix[NPos];
					Name = Prefix.slice(NPos + 1, SPos);

					let NumStr = Prefix.slice(++SPos, SPos + 12);
					if ((EndPos = NumStr.indexOf(',')) >= 0)
						NumStr = NumStr.slice(0, EndPos);

					nBytes = Number(NumStr);

					// console.log (Type + Name +':Offset = ' + Offset.toString () + 
					// ' NumStr =' + NumStr + '. nBytes =' + nBytes.toString () );


					DBuf = AB.slice(Offset, Offset + nBytes);

					if (DBuf.byteLength !== nBytes) {
						console.log ('  !! DBuf bytes = ' + DBuf.byteLength.toString ());
						throw "LimitError!";
					}

					if (Name === 'ist')
						throw ('ist!3');

					let NewFld = new PackField (Name,DBuf,Type);

					if ((NewFld.Name[0] >= '0') || !NewFld.Name) {
						this.Ds.push (NewFld);
					}
					else {
						this.Cs.push (NewFld);
					}

					//console.log('  BufIn C/D = ' + this.Cs.length.toString () + '/' +
					//	this.Ds.length.toString () + ' ' + NewFld.Desc());

					Offset += nBytes;	//	NewFld.Size, should be same!
					NPos = SPos;
				}
			}
		}

		clear() {
			this.Cs = [];
			this.Ds = [];
			this._type = '';
			this._details = '';
		}

		freeABs () {
			let Fs = this.Cs.concat (this.Ds), Lim = this._ABLimit;
			for (const F of Fs) {
				if (F.AB.byteLength > Lim)
					F.setAB (null);
			}
		}

		get multi () {
			if (this._type  &&  (this._type[0] === '*'))
				return this.Ds.length;
			else return 0;
		}

	//	Unpack creates an array of BufPacks corresponding to the BufPacks
	//	that are packed in this single BufPack. Also strips out the 

		unpackArray () : BufPack[] {
			if (!this.multi)
				return [];

			let BPs = new Array<BufPack> (this.Ds.length);
			//let BPs = Array<BufPack> ();
			let count = 0;

			for (const F of this.Ds) {
					let NewBP = new BufPack ();
					NewBP.bufIn (F.AB);
					BPs[count++] = NewBP;
			}

			this._type = this._type.slice (1);	// result is NOT a multipack...
			this.Ds.length = 0;

			return BPs;
		}

		/* Pack allows multiple BufPacks to be packed into a single BufPack,
		often to send to another client or server.  The array of BufPacks to
		pack is passed in	*/

		packArray (BPs : BufPack[]) {
			let NewFields = new Array<PackField> (BPs.length);
			let count = 0;

			let limit = BPs.length;
			for (let i = 0; i < limit; ++i) {
				NewFields[count++] = new PackField ('',BPs[i]);
			}
			this.Ds = NewFields;

			if (this._type[0] !== '*')
				this._type = '*' + this._type;

			//	console.log ('2.Type1 set to ' + this.Type1);
		}

		objectIn (O : Object) {
		    this.notNIL;

			this.clear ();
			
			console.log ('ObjectIn:Adding entries!');

			let entries = Object.entries (O);
			let AddArray = Array(entries.length << 1);
			let count = 0;

			for (let entry of entries) {
				AddArray[count++] = entry[0];
				AddArray[count++] = entry[1];

				console.log ('   AddArray[' + count.toString () + '] entry = ' + entry);
			}

			this.addArgs (AddArray);
			console.log ('ObjectIn Resultant BP:' + '\n' + this.desc);
		}

		objectOut () : Object {
			let o = new Object ();
			let Fields = this.Cs.concat (this.Ds);

			for (let F of Fields) {
				let N = F.Name;
				switch (F.Type) {
					case tNum : Object.assign (o,{ N : F.Num }); break;
					case tStr : Object.assign (o,{ N : F.Str }); break;
					case tPack : case tData : Object.assign (o, {N : F.Pack.copy }); break;
					case tList : Object.assign (o, {N : new qList (F.List.to$)}); break;
						
					default : Object.assign (o,{ N : F.AB.slice(0) }); break;
				}
			}

			console.log ('New Object = ' + o);
			return o; 
		}

		get names () {
			let Fields = this.Cs.concat (this.Ds);
			let nFields = Fields.length;

			let Str = 'Names[' + nFields.toString () + ']=';
			for (const F of Fields) {
				Str += F.NameVal + ' ';
			}

			return Str;
		}		
	}

	export const NILPack = new BufPack ('','NILPack');

	export class Nug extends BufPack {
		l : qList|null = null;

		constructor (In:ArrayBuffer|string='') {
			super ();
			let Str = '';

			let Input = typeof (In);
			if (Input === 'string') {	// ONLY list, BufPack is empty
				Str = Input as string;
			}
			else {	//	AB
				let AB = In as ArrayBuffer;
				if (AB.byteLength > 0) {
					this.bufIn (AB);
					
					let F = this.getField (SysPrefix+SysPrefix);
					if (F)
						Str = F.Str;
				}
			}

			this.l = new qList (Str);
		}
	}

	export class SQL {
		bSelDel (Tile : string, ID : number, Query : string) : BufPack {
			let Pack = new BufPack ();
			Pack.xAdd ('Q', Query);
			Pack.addArgs (['.T', Tile, '.I', ID]);

			return Pack;
		}

		bInsUpd (Pack : BufPack) : BufPack {
			let ID = Pack.fNum ('.I');

			Pack.xAdd ('Q',ID ? 'U' : 'I');
			return Pack;
		}

	}	// RS1

	export const sql = new SQL ();

	(() => {


		// Immediately Invoked Function Expression IIFE
		// Code that runs in your function

		let Q = ['List', qList, '', RSData];
		// let RSDT = new RSDataType ('List',vList);
		// let QDT = new RSDataType ('ABC',PackToData);

		RegPackToData (PackToData);
		_Classes.push (qList);
		// let List = new _Classes[0];

		console.log ('NILData TEST!');
	})()	

	/*	Defines for vLists	*/

	// FM:FM="FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|"
	export const FMDollar = 3,
		FMInt = 2,
		FMMember = 8,
		FMNum = 1,
		FMNums = 7,
		FMOrd = 4,
		FMPair = 6,
		FMRange = 5,
		FMSet = 9,
		FMStr = 10,
		FMStrs = 11,
		FMUpper = 12;
	// Ct:Country="Ct:Country|US:United States|UK:United Kingdom|Ca:Canada|Ru:Russia|In:India|"
	export const CtCa = 3,
		CtIn = 5,
		CtRu = 4,
		CtUK = 2,
		CtUS = 1;
	// Ct:ConnectType="Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|"
	export const CtAction = 3,
		CtDB = 5,
		CtData = 1,
		CtEvent = 2,
		CtQueue = 4,
		CtRemote = 7,
		CtRetail = 8,
		CtSQL = 6;
	// Lt:ListType="Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|"
	export const LtAc = 3,
		LtDt = 1,
		LtEv = 2,
		LtLg = 9,
		LtMt = 8,
		LtPr = 7,
		LtRt = 4,
		LtTd = 5,
		LtTs = 6;
	// Dt:DataType="Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|"
	export const DtString = 1,
		DtInteger = 2,
		DtNumber = 3;
	// Ev:Event="Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|"
	export const EvClick = 1,
		EvDblClick = 4,
		EvDrag = 7,
		EvDrop = 6,
		EvEnter = 2,
		EvExit = 3,
		EvSwipe = 5;
	// Rt:Return="Rt:Return|Ok|Fail|Equal|Unequal|Queue|"
	export const RtEqual = 3,
		RtFail = 2,
		RtOk = 1,
		RtQueue = 5,
		RtUnequal = 4;
	// Td:TileDef="Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|"
	export const TdBtn = 4,
		TdImg = 5,
		TdLnEdit = 2,
		TdTile = 1,
		TdTxtEdit = 3,
		TdVideo = 6;
	// Ts:TileSize="Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|"
	export const TsB = 5,
		TsBL = 6,
		TsBR = 7,
		TsFixed = 1,
		TsL = 8,
		TsR = 9,
		TsSH = 10,
		TsT = 2,
		TsTL = 3,
		TsTR = 4;
	// Pr:Process="Pr:Process|Init|Read|Set|Clear|Default||"
	export const Pr = 6,
		PrClear = 4,
		PrDefault = 5,
		PrInit = 1,
		PrRead = 2,
		PrSet = 3;
	// Mt:MessageType="Mt:MessageType|Input|Output|Event|Trigger|Action|"
	export const MtAction = 5,
		MtEvent = 3,
		MtInput = 1,
		MtOutput = 2,
		MtTrigger = 4;
	// Ac:Action="Ac:Action|Init|Timer|Login|Logout|"
	export const AcInit = 1,
		AcLogin = 3,
		AcLogout = 4,
		AcTimer = 2;
	// Lg:Language="Lg:Language|En:English|Es:Espanol|Cn:Chinese|"
	export const LgCn = 3,
		LgEn = 1,
		LgEs = 2;
	// Test:Test="Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|"
	export const TestCost = 3,
		TestNameF = 1,
		TestXY = 2;

	export const TypeArray = [
		FMNum,
		FMInt,
		FMDollar,
		FMPair,
		FMOrd,
		FMNums,
		FMStr,
		FMUpper,
		FMMember,
		FMRange,
		FMSet
	];

	export const TypeNames = ['Number','Integer','Dollar','Pair',
						'Ordinal','Numbers','String',
						'UpperCase','Member','Range','Set'];
	export const TypeChars = '#I$POA%U@R{';

	function zFindPos (z:string,dName:string,start=0) {	//dName first char is delim
		let pos = z.indexOf (dName + ':');
		return pos >= 0 ? pos : z.indexOf (dName + dName[0],start);	
	}
	function zFindLinePos (z:string,Name:string,start=0) {
		return zFindPos (z,'\n' + Name,start);
	}
	function zFindQPos (z:string,QName:string,start=0) {
		return zFindPos (z, '\t' + QName, start);
	}
	function zFindLineAndQ (z:string,Line:string,Q:string,start=0) {
		let linePos = zFindPos (z, '\n' + Line, start);
		if (linePos < 0)
			return -1;
		return zFindPos (z, '\t' + Q, linePos);
	}
	function zGetPairPos (z:string, name:string, start=0) {
		let endpos = z.indexOf ('\t', start), dName = '|' + name;
		let pos = z.indexOf (dName + '|',start);
		if (pos < 0)
			pos = z.indexOf (dName + ':',start);
		if (pos < 0)
			return -1;		// not found

		let NLpos = z.indexOf ('\n');
		if ((pos < NLpos)  &&  (pos < endpos))
			return pos;		// found name within the target line

		return -1;			// not found within target line
	}

	function zGetPair (z:string, name:string, start=0) {
		let pos = zGetPairPos (z, name, start);

		if (pos < 0)
			return	'';

		let endpos = z.indexOf ('|',++pos);
		return (endpos >= 0) ? z.slice (pos, endpos) : ''
	}

	function zGetQStr (z:string,QName:string,start=0) {
		let qPos = zFindQPos (z, QName, start);
		if (qPos >= 0) {
			let endPos = z.indexOf ('\t',++qPos);
			if (endPos >= 0)
				return z.slice (qPos, endPos);
		}
		return	'';
	}

	function zGetLine (z:string,Name:string,start=0) {
		let pos = zFindPos (z,'\n'+Name, start);
		if (pos >= 0) {
			let endPos = z.indexOf ('\n',++pos);
			if (endPos >= 0)
				return z.slice (pos, endPos);
		}
		return	'';
	}

	function zValidate (In:string|string[]) {	// reformat zList string, if needed, or just return it
		let z:string, delim;
		
		if ((typeof In) === 'string') {
			z = In as string;
			if ((delim = z.slice (-1)) !== '\n')
				z = delim + '\n';
			}
		else z = (In as string[]).join ('\n') + '\n';

		return z;
	}

} // namespace RS1



/*

	class vListXtra {
		vL? : qList;
		qL? :qList;

		count=0;
		IDs?: number[];
		NameIDs='';
		Childs?:qList[];
		_firstDelim = -1;
		Delim = '|';
		_indent=0;
		LType: CLType = CLType.None;
		Name=''
		Desc=''

		get _Indent () { return this._indent; }

		constructor (vL = NILList) { this.vL = vL; }

		InitList(Str1: string | string[]) {
			if (!Str1)
				Str1 = '|';

			this.NameIDs = '';
			this._indent = 0;

			if (Array.isArray(Str1)) Str1 = Str1.join('\n') + '\n';

			let StrLen = Str1.length;

			let NamePos = 0; // default start of Name
			let Ch = Str1[0];
			if (Ch <= '9') {
				if (Ch <= ' ') {
					while (Ch === ' ' || Ch === '\t') {
						this._indent++;
						Ch = Str1[++NamePos];
					}
				} else if (Ch >= '0') {
					let Zero = '0'.charCodeAt(0);
					this._indent = Ch.charCodeAt(0) - Zero;
					if ((Ch = Str1[++NamePos]) >= '0' && Ch <= '9') {
						// second digit (only two allowed)
						this._indent = this._indent * 10 + Ch.charCodeAt(0) - Zero;
						++NamePos;
					}
				}
			}

			let Delim1 = Str1[StrLen - 1];

			this._firstDelim = -1;

			if (!isDelim(Delim1)) {
				let i = NamePos;
				while (i < StrLen)
					if (isDelim((Delim1 = Str1[i]))) {
						this._firstDelim = i;
						Str1 += Delim1; // add (missing) delim to end of string
						++StrLen;
						break;
					} else ++i;

				if (i >= StrLen) return; // panic, no Delim
			}

			this.Delim = Delim1;
			// Note that delimiter is typically '|', placed at end of string, but \0 could
			// be used if one wished to allow '|' to appear within the const description

			console.log ('InitList (' + Str1 + ')');

			this.Childs = undefined;
			this.IDs = undefined;

			if (this.vL.firstDelim <= 0) this._firstDelim = Str1.indexOf(Delim1, NamePos);

			if (Delim1 < ' ') {
				// special case, embedded vLists!
				this.count = 0;
				this.LType = CLType.Pack;

				let Strs = Str1.split(Delim1);
				let limit = Strs.length;

				if (limit  <= 0) return; // panic, no strings, should never happen

				Str1 = '';
				--limit;
				for (let i = 0; ++i < limit; ) {
					if (Strs[i][0] === '/' || !Strs[i].trim()) continue; //	ignore comment lines

					let Child: qList = new qList(Strs[i]);
					if (Child) {
						if (!this.Childs) this.Childs = [];
						this.Childs.push(Child);

						if (!Str1) Str1 = Strs[0] + Delim1; // we are just finding the first line (Name:Desc)
					}
				}
			}
		
			//let NameStr = Str1.slice(NamePos, this.vL.firstDelim);
			let NameStr = Str1.slice(NamePos, this._firstDelim);
		
			//let i = NameStr.indexOf(':');
			let i = NameStr.indexOf('|');
			if (i >= 0) {
				this.Desc = NameStr.slice(i + 1);
				this.Name = NameStr.slice(0, i);
			} else {
				for (let lim = NameStr.length, i = 0; i < lim; ++i)
					if (NameStr[i] <= ' ') {
						NameStr = NameStr.slice(0, i);
						if ((NameStr = '')) NameStr = 'Q';
						break;
					}

				this.Desc = this.Name = NameStr;	
			}

			console.log('InitList (' + this.Name + '), NameStr =' + NameStr + '.');

			this.vL.from$ (Str1);

			//			console.log ('InitList ' + this._Name + ' Indent = ' + this._Indent.toString () + ' #C =' +
			//				this.ChildCount.toString () + ' Count = ' + this.Count.toString () + ' Str=' + this._Str);

			if (Delim1 < ' ') return; // done processing, vList with kids...

			let FirstChar = Str1[this.vL.firstDelim + 1];

			let IDList = isDigit(FirstChar);
			this.LType = IDList ? CLType.ID : CLType.Std;

			if (IDList) {
				let N = 0, limit = StrLen - 1;
				let Pos: number[] = Array(99);
				Pos[0] = 0;

				for (let i = this.vL.firstDelim - 1; ++i < limit; ) {
					if (Str1[i] === Delim1) {
						Pos[++N] = Number(Str1.slice(i + 1, i + 25));
					}
				}
				this.count = N;
				Pos.length = N + 1;
				this.IDs = Pos;
			}

			this.NameList();
		}

		get firstDelim () {
			// if (this._firstDelim < 0)
			//	this._firstDelim = this.vL.x.toStr.indexOf (this.vL.x.Delim);

			return this.vL.firstDelim;
		}

		get qstr () {
			if (this.vL)
				return this.vL.to$;
			else if (!this.qL)
				return 'NILList';
			else return '|';
		}

		get toRaw () : string[] {
			let Strs = this.qstr.split (this.Delim);
			return Strs.slice (1,-1);
		}

		fromRaw (VIDStrs:string[]=[]) {
			let D = this.Delim, NameDesc = this.qstr.slice (0,this.qstr.indexOf(D)+1);
			let VIDStr = VIDStrs.join (D);
			if (this.vL)
				this.vL.from$ (NameDesc + (VIDStr ? (VIDStr + D) : ''));
		}

		get toVIDs () {
			let Strs = this.toRaw;
			let VIDs = new Array<vID> (Strs.length);

			let count = 0;
			for (const S of Strs) {
				VIDs[count++] = new vID (S);
			}
			return VIDs;
		}

		static VIDsToLines(VIDs: vID[], Delim: string): string[] {
			let i = VIDs.length;
			let Lines: string[] = new Array(i);

			while (--i >= 0) Lines[i] = VIDs[i].ToLine(Delim);

			return Lines;
		}

//		get toVList () {
//			return new vList (this.qstr);
//		}

		toVIDList (Sep=';',Delim='') {
			if (!Delim)
				Delim = ':';

			let VIDs = this.toVIDs, Str = '';

			for (const v of VIDs)
				Str += v.Name + Delim + v.Desc + Sep;

			return Str.slice (0,-1);
		}

		fromVList (L : vList) {
			this.InitList (L.x.toStr);
		}

		GetNamePos(Name: string|number): number {
            return this.vL  ? this.vL.qFindName (Name) : -1;
			}

	   get size () {
            return this.vL.count;
  	   }

		get toStr() : string {
			if ((this.LType != CLType.Pack)  &&  this.vL)
				return this.vL.to$;

			if (!this.Childs) return '';

			let Strs = [this.qstr.slice(0, -1)];
			let limit = Strs.length;
			for (let i = 0; i < limit; ) {
				let Child = this.Childs[i++];
				if (Child) Strs.push(Child.to$);
			}

			return Strs.join(this.Delim) + this.Delim;
		}

		get FirstChild(): qList {
			return (this.Childs) ? this.Childs[0] : NILList;
		}

		Merge(AddList: qList | undefined): boolean {
			let DestStrs = this.qstr.split(this.Delim);
			DestStrs.length = DestStrs.length - 1;
			let Destlimit = DestStrs.length;
			let Appended = 0, Replaced = 0;
			
			console.log('Merging Dest:');

			for (let i = 0; i < Destlimit; ++i) console.log('Q1  ' + DestStrs[i]);

			if (!AddList) return false;

			let AddStrs = AddList.to$.split('|');

			let Addlimit = AddStrs.length - 1; // don't use last!
			console.log('Adding List');
			for (let i = 0; i < Addlimit; ++i) console.log('Q2  ' + AddStrs[i]);
 
			let NameD, Name;

			for (let i = 0; ++i < Addlimit; ) {
				let Pos = AddStrs[i].indexOf(':');
				let Replacer = Pos >= 0;
				Name = Replacer ? AddStrs[i].slice(0, Pos) : AddStrs[i];
				NameD = Name + ':';

				for (let j = 0; ++j < Destlimit; ) {
					if (DestStrs[j].startsWith(Name)) {
						// at least partial match, is it full?
						if  (DestStrs[j].startsWith(NameD) || DestStrs[j] == Name) {
							// TRUE match
							if (Replacer || DestStrs[j] == Name) {
								// need to replace
								// console.log('Replacing with ' + AddStrs[i]);
								DestStrs[j] = AddStrs[i];
								++Replaced;
								Name = ''; // done, no more processing
							} else {
								Name = '';
								break; // TRUE match, not replaced, we are done
							}
						}
					}
				}

				// not found, need to add at end...
				if (Name) {
					// still active
					// console.log('Appending ' + AddStrs[i]);
					++Appended;
					DestStrs.push(AddStrs[i]);
				}
			}

			if (Replaced || Appended) {
				let NewStr = DestStrs.join(this.Delim) + this.Delim;
				this.InitList(NewStr);
			}

			return false;
		}

		private SetDelim(NewDelim: string): boolean {
				let OldDelim = this.Delim;

			if (!NewDelim || NewDelim.length != 1 || NewDelim == OldDelim || isDigit(NewDelim))
				return false;

			this.qstr.replaceAll(OldDelim, NewDelim);
			this.Delim = NewDelim;
			return true;
		}

		private VIDByPos(Pos1: number): vID | undefined {
			if (Pos1 < 0) return undefined;

			let EndPos = this.qstr.indexOf(this.Delim, Pos1);
			if (EndPos < 0) return undefined;

			let FoundStr = this.qstr.slice(Pos1, EndPos);
			return new vID(FoundStr);
		}

		ByIDs(IDs: number[], Sort: boolean = false): vID[] {
			if (!IDs) {
				// copy all in list
				let i = this.count;
				IDs = new Array(i);
				while (--i >= 0) IDs[i] = i + 1;
			}

			let VIDs: vID[] = [];
			for (let i = IDs.length; --i >= 0; ) {
				let VID = this.GetVID(IDs[i]);
				if (VID) VIDs.push(VID);
			}

			if (Sort) 
				qList.qSortVIDs(VIDs);

			return VIDs;
		}

		NameList(UseList = 1): string {
			if (UseList && this.NameIDs) return this.NameIDs;

			let Str1 = this.qstr;
			let Start = this.firstDelim - 1;
			let Delim1 = this.Delim;
			let ID = 0;
			let NameStr = Delim1;

			while ((Start = Str1.indexOf(Delim1, Start)) >= 0) {
				let EndDelim = Str1.indexOf(Delim1, ++Start);
				if (EndDelim < 0) break;
				let NewStr = Str1.slice(Start, EndDelim);

				let EndName = NewStr.indexOf(':');
				if (EndName >= 0) NewStr = NewStr.slice(0, EndName);

				++ID;
				NameStr += NewStr + ':' + ID.toString() + Delim1;
			}

			this.NameIDs = NameStr;
			this.count = ID;
			return NameStr;
		}


		GetDesc(Name: string): string | undefined {
			let SearchStr = this.Delim + Name + ':'; // e.g. '|NameXYZ:''
			let Pos1 = this.qstr.indexOf(SearchStr, this.firstDelim);
			if (Pos1 >= 0) {
				let StartPos = Pos1 + SearchStr.length;
				let EndPos = this.qstr.indexOf(this.Delim, StartPos);

				if (EndPos > 0) return this.qstr.slice(StartPos, EndPos);
			}
			return undefined;
		}

		GetNum(Name: string): number | undefined {
			let Str = this.GetDesc(Name);
			return Str ? Number(Str) : undefined;
		}

		GetStr(Name: string) {
			let Str = this.GetDesc(Name);
			console.log('GetStr (' + Name + ') GetDesc returns "' + Str + '"');

			if (Str) {
				if (Str[0] === '[') {
					let EndPos = Str.indexOf(']', 1);

					if (EndPos > 0) return Str.slice(EndPos + 1);
					else console.log(']' + ' not present!');
				} else return Str;
			}
			return '';
		}

		UpdateVID(VID: vID, Delete = false) {
			if (!VID) return;

			let Delim = this.Delim;
			let Str = this.qstr;

			let SearchStr = Delim + VID.Name;
			let Pos = Str.indexOf(SearchStr + Delim, this.firstDelim);
			if (Pos < 0) {
				Pos = Str.indexOf(SearchStr + ':', this.firstDelim);
			}

			if (Pos >= 0) {
				let EndPos = Pos;

				while (Str[++EndPos] !== Delim);

				//if (EndPos < Str.length - 1) {
				// not the last element in list!
				if (Delete) Str = Str.slice(0, Pos) + Str.slice(EndPos);
				else Str = Str.slice(0, Pos + 1) + VID.to$ + Str.slice(EndPos);

			} else {
				if (Delete) return; //	ABORT, should not happen!

				// VID not found, we must add to the end!
				Str += VID.to$ + Delim;
			}

			this.InitList(Str);
		}

		Bubble(Name: string, dir: number) {
			// check for special easy case - list of Childs
			if (this.LType == CLType.Pack) {
				if (!this.Childs) return;

				for (let i = this.Childs.length; --i >= 0; )
					if (this.Childs[i].Name === Name) {
						le t First, Second;

						if (dir <= 0) {
							Second = i;
							First = i - 1;
							if (First < 0) return;
						} else {
							First = i;
							Second = i + 1;
							if (Second >= this.Childs.length) return;
						}

						let TempList = this.Childs[First];
						this.Childs[First] = this.Childs[Second];
						this.Childs[Second] = TempList;
						return;
					}

				return; // no match found
			}

			let Pos = this.GetNamePos(Name);
			if (Pos < 0) return -1; // cannot find, we are done

			let StartPos, EndPos;

			let First = '', Second = '';

			if (dir <= 0) {
				// bubble up
				for (StartPos = Pos; --StartPos >= 0; ) if (this.qstr[StartPos] == this.Delim) break;

				if (StartPos < 0) return -1; // cannot find previous

				EndPos = this.qstr.indexOf(this.Delim, Pos + 1);
				if (EndPos < 0) return -1;

				Second = this.qstr.slice(Pos, EndPos);
				First = this.qstr.slice(StartPos, Pos);
			} else {
				// bubble down
				StartPos = Pos;
				EndPos = this.qstr.indexOf(this.Delim, Pos + 1);
				let NextEnd;

				if (EndPos >= 0) {
					// found end of first
					First = this.qstr.slice(Pos, EndPos);
					NextEnd = this.qstr.indexOf(this.Delim, EndPos + 1);

					if (NextEnd < 0) return; // cannot find next

					Second = this.qstr.slice(EndPos, NextEnd);
					EndPos = NextEnd;
				} else return;
			}

			if (!First || !Second) return -1;

			let NewStr = this.qstr.slice(0, StartPos) + Second + First + this.qstr.slice(EndPos);
			this.InitList(NewStr);
		}

		GetVID(IDorName: string | number): vID | undefined {
			// let Name: string = (typeof IDorName !== 'number') ? IDorName : this.NameByID(IDorName);

			let Pos1 = this.GetNamePos(IDorName);

			if (Pos1 >= 0) {
				// we found it
				return this.VIDByPos(Pos1 + 1);
			} else return undefined;
		} 

		ChildByName(Name1: string) {
			if (!this.Childs) return undefined;

			let limit = this.Childs.length;

			for (let i = 0; i < limit; ++i) {
				if (this.Childs[i].Name == Name1) return this.Childs[i];
			}

			return undefined;
		}

		GetLine(ID: any, Delim1: string = ''): string {
			let VID: vID | undefined = this.GetVID(ID);
			return VID ? VID.ToLine(Delim1) : '';
		}

		IDsToRefList(IDs: number[]): vList | undefined {
			if (IDs) {
				let Delim = this.Delim;
				let Ret = this.Name + Delim;
				for (let i = IDs.length; --i >= 0; ) {
					Ret += IDs[i].toString() + Delim;
				}

				return new vList(Ret);
			}
			return undefined;
		}

		VIDsToRefList(VIDs: vID[] | undefined): vList | undefined {
			if (VIDs) {
				let IDs: number[] = new Array(VIDs.length);

				for (let i = VIDs.length; --i >= 0; ) {
					IDs[i] = VIDs[i].ID;
				}

				return this.IDsToRefList(IDs);
			} else return undefined;
		}

		ToSortedVIDs(): vID[] {
			let VIDs = this.toVIDs;
			qList.qSortVIDs(VIDs);
			return VIDs;
		}

		ToDC(): string {
			let VIDs = this.ToSortedVIDs();
			let limit = VIDs.length, FmtStr = '';

			let LineStr = '// ' + this.Name + ':' + this.Desc + '="' + this.qstr + '"\n';
			let Line = 'export const ';
			for (let i = 0; i < limit; ++i) {
				Line += VIDs[i].ToDC(this.Name) + ',';

				let VID = VIDs[i];
				if (VID.Fmt) {
					// print out format
					FmtStr += '//\t' + VID.Name + ' ~' + VID.Fmt.Ch;

					if (VID.Fmt.Xtra) FmtStr += ' Xtra="' + VID.Fmt.Xtra + '"';

					if (VID.Fmt.Num) FmtStr += ' Num=' + VID.Fmt.Num.toString();

					if (VID.Fmt.Type) FmtStr += ' Type=' + VID.Fmt.Type.toString();

					FmtStr += '\n';
				}
			}

			Line = Line.slice(0, Line.length - 1) + ';';
			while (Line.length > 70) {
				let i = 70;
				while (--i && Line[i] !== ',');

				LineStr += Line.slice(0, ++i) + '\n\t';
				Line = Line.slice(i);
			}
			LineStr += Line + '\n';

			LineStr += FmtStr;

			return LineStr;
		}

		toSelect(Select: HTMLSelectElement | HTMLOListElement | HTMLUListElement) {
			let VIDs = this.toVIDs;
			let VIDLen = VIDs.length;

			if (Select instanceof HTMLSelectElement) {
				Select.options.length = 0;
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToSelect(Select);
			} else if (Select instanceof HTMLOListElement || Select instanceof HTMLUListElement) {
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToList(Select);
			}
		}

		NewThis () : vList { return new vList (this.toStr); }

		get copy () {
			return new vList (this.toStr);
		}

	}

/*
	class zList extends qList {
		// qL = null;

		// _count=0;
		// IDs: number[] | undefined;
		// NameIDs='';
		Childs:vList[]=[];
		// _firstDelim = -1;
		Delim = '|';
		// Indent=0;
		// LType: CLType = CLType.None;
		// Name=''
		// Desc=''

		// constructor (vL = NILList) { this.vL = vL; }


		get toStr() {
			if (!this.Childs) return '';

			let Strs = [this.qstr.slice(0, -1)];
			let limit = Strs.length;
			for (let i = 0; i < limit; ) {
				let Child  = this.Childs[i++];
				if (Child) Strs.push(Child.qstr);
			}

			return Strs.join(this.Delim) + this.Delim;
		}

		get FirstChild(): vList {
			return (this.Childs) ? this.Childs[0] : NILList;
		}
	}
*/

/*
	export class xvList extends RSData {
		x = NILvLX;
		_type = 'List';
		qstr = '';

		Init (str='|') { this.qstr = str; }

		get indent () {
			let ind = 0;

			let NamePos = 0; // default start of Name
			let Ch = this.qstr[0];
			if (Ch <= '9') {
				if (Ch <= ' ') {
					while (Ch === ' ' || Ch === '\t') {
						ind++;
						Ch = this.qstr[++NamePos];
					}
				} else if (Ch >= '0') {
					let Zero = '0'.charCodeAt(0);
					ind = Ch.charCodeAt(0) - Zero;
					Ch = this.qstr[++NamePos];
					if ((Ch >= '0') && (Ch <= '9')) {
						// second digit (only two allowed)
						ind = (ind * 10) + Ch.charCodeAt(0) - Zero;
					}
				}
			}
			return ind;
		}

		get Indent () { return this.indent; }
			// return (this.x !== NILvLX) ? this.x._Indent : 0; }

		get toStr () {
			return (this.x === NILvLX)  ||  (this.x.Delim === '|') ? this.qstr : this.x.toStr;
		}

		constructor(Str1: string | string[] | BufPack = '') {
			//	, First: vList | undefined = undefined) {
			let Str, Strs, BP;
			
			super ();

			this.x = new vListXtra (this);

			if ((typeof Str1) === 'string') {
				this.x.InitList (Str1 as string);
			}
			else if (Array.isArray (Str1)) {
				this.x.InitList (Str1 as string[]);
			}
			else {
				let BP = Str1 as BufPack;
				this.x.InitList (BP.fStr ('data'));
			}

		}

		PostSave (P : BufPack) { P.addArgs (['data', this.toStr]); }
		PostLoad (P : BufPack) { this.qstr = P.fStr ('data'); this.Data = NILAB; console.log ('PostLoad vList'); }

// ------------------ qList functions ---------------------


        fromStr (Str='|') {
            this.qstr = Str;
        }

        get d () { return this.qstr.slice(-1); }

        get size () { return (this.qstr.length > 1) ? 1 : 0; }	// not NULL list

        get firstDelim () { return this.qstr.indexOf(this.d); }

        get descStr () {
            let Type = this.desc1 ('Type');
            return this.listName + '[Type=' + Type + ']' + (this.listDesc? (':'+this.listDesc):''); 
        }

        get count () {
            let n = this.qstr.split (this.d).length - 2;
            return n > 0 ? n : 0;
        }

        namedescstr (start=0) {
            return this.qstr.slice(start,this.qstr.indexOf(this.d,start));
        }


        namedesc (start=0) {
            let str = this.namedescstr (start);
            return strPair.namedesc(str);
        }

        getNFD (start=0) {
            return new NFD (this.namedescstr (start));
        }

        setNameOrDesc (name='',ifDesc=false) {
            let pos = this.qstr.indexOf(this.d);
            let head = this.qstr.slice (0,pos), tail = this.qstr.slice (pos);
            let nd = strPair.namedesc(head);
            let desc = nd.b;

            if (ifDesc) {
                desc = name;
                name = nd.a;
            }

            this.fromStr (name + (desc ? (':' + desc) : '') + tail);
        }

        get listName() { return this.namedesc().a; }

        get listDesc () { return this.namedesc().b; }

        num (name:string|number) {
            return Number (this.desc1 (name));
        }

        find (name:string|number) {
            let D = this.d, str = D + name.toString ()+':';
            let nPos = this.qstr.indexOf (str);
            if (nPos >= 0)
                return nPos;

            str = str.slice (0,-1) + D;
            return this.qstr.indexOf (str);
        }

        prepost (name:string|number) {
            let nPos = this.find (name);
            if (nPos >= 0) {
                let dPos = this.qstr.indexOf (this.d,++nPos);
                if (dPos >= 0)
                    return new strPair (this.qstr.slice (0,nPos),this.qstr.slice (dPos));
            }

            return new strPair ('','');
        }

        del (name:string|number) {
            let pair = this.prepost (name);
            if (pair.a)
                this.qstr = pair.a + pair.b;
        }

        add (name:string|number,desc:string|number) {
            let vStr = name.toString () + ':' + desc.toString (), pair = this.prepost(name);

            if (pair.a)
                this.qstr = pair.a + vStr + pair.b;
            else this.qstr += vStr + this.d;
        }

        set (name:string|number,desc:string|number) {
            this.add (name,desc);
        }

        getVID (name:string|number) {
            let nPos = this.find (name);
            if (nPos >= 0) {
	            let endPos = this.qstr.indexOf(this.d,nPos+1);
    	        if (endPos >= 0)
	                return new vID (this.qstr.slice (nPos,endPos));
			}
        }

        desc1 (name:string|number) {
            let nPos = this.find (name);
            if (nPos < 0)
                return '';

            let endPos = this.qstr.indexOf (this.d,nPos);
            if (endPos >= 0)
                return this.qstr.slice (nPos,endPos);
            return '';
        }

        nameByDesc (desc:string|number) {
            let D=this.d, str = ':' + desc.toString () + D;
            let vPos = this.qstr.indexOf (str);
            if (vPos < 0)
                return '';

            for (let nPos = vPos; --nPos >= 0;)
                if (this.qstr[nPos] === D)
                    return this.qstr.slice (nPos + 1,vPos);

            return '';
        }

        get VIDStrs () : string[] {
            let Strs = this.qstr.split (this.d);
            return Strs.sl ice (1,-1);
        }

        get toVIDs () {
            let Strs = this.VIDStrs;
            let VIDs = new Array<vID> (Strs.length);

            let count = 0;
            for (const S of Strs) {
                VIDs[count ++] = new vID (S);
            }
            return VIDs;
        }

        static VIDsToLines(VIDs: vID[], Delim: string): string[] {
            let i = VIDs.length;
            let Lines: string[] = new Array(i);

            while (--i >= 0) Lines[i] = VIDs[i].ToLine(Delim);

            return Lines;
        }

        fromRaw (vStrs:string[]=[]) {
            let D = this.d, NameDesc = this.qstr.slice (0,this.qstr.indexOf(D)+1);
            let VIDStr = vStrs.join (D);
            this.qstr = NameDesc + (VIDStr ? (VIDStr + D) : '');
        }

        get splitNames () : strsPair {
            let raw = this.VIDStrs, names=new Array<string> (raw.length),count=0;

            for (const s of raw) {
                let dPos = s.indexOf(':');
                names[count++] = (dPos >= 0) ? s.slice (0,dPos) : s;
            }

            return new strsPair (names,raw);
        }

        get names () { return this.splitNames.a; }

        merge (addend : qList) {
            let dest = this.splitNames, add = addend.qSplitNames;

            for (let lim = add.a.length, i = 0; i < lim;++i) {
                let j = dest.a.indexOf (add.a[i]);
                if (j >= 0) 	// need to replace
                    dest.b[j] = add.b[i];
                else {
                    dest.a.push (add.a[i]);
                    dest.b.push (add.b[i]);
                }
            }

            this.fromRaw (dest.b);
        }

        get toVList () {
            return new vList (this.qstr);
        }

        fromVList (L : vList) {
            this.fromStr (L.x.toStr);
        }

        toSelect(Select: HTMLSelectElement | HTMLOListElement | HTMLUListElement) {
            let VIDs = this.toVIDs;
            let VIDLen = VIDs.length;

            if (Select instanceof HTMLSelectElement) {
                Select.options.length = 0;
                for (let i = 0; i < VIDLen; ) VIDs[i++].ToSelect(Select);
            } else if (Select instanceof HTMLOListElement || Select instanceof HTMLUListElement) {
                for (let i = 0; i < VIDLen; ) VIDs[i++].ToList(Select);
            }
        }

        static SortVIDs(VIDs: vID[]) {
            let limit = VIDs.length;
            var Temp: vID;

            for (let i = 0; ++i < limit; ) {
                for (let j = i; --j >= 0; ) {
                    if (VIDs[j].Desc > VIDs[j + 1].Desc) {
                        Temp = VIDs[j];
                        VIDs[j] = VIDs[j + 1];
                        VIDs[j + 1] = Temp;
                    } else break;
                }
            }
        }

        newRef (name='') {
            return new qList (name+':'+'@'+this.listName);
        }





    } // vList

	export const NILList = new qList ('NIL|');
	export const NILvLX = new vListXtra (NILList);
*/






/*  Documentation Names/Desc	___________________



List FM(FM)	FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|
Dollar	Dollar	ID[Dollar]==3
Int	Int	ID[Int]==2
Member	Member	ID[Member]==8
Num	Num	ID[Num]==1
Nums	Nums	ID[Nums]==7
Ord	Ord	ID[Ord]==4
Pair	Pair	ID[Pair]==6
Range	Range	ID[Range]==5
Set	Set	ID[Set]==9
Str	Str	ID[Str]==10
Strs	Strs	ID[Strs]==11
Upper	Upper	ID[Upper]==12
NameList=|Num:1|Int:2|Dollar:3|Ord:4|Range:5|Pair:6|Nums:7|Member:8|Set:9|Str:10|Strs:11|Upper:12|	12


List Ft(Ft)	Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|
$	Dollar	ID[$]==3
I	Int	ID[I]==2
@	Member	ID[@]==9
#	Num	ID[#]==1
A	Nums	ID[A]==6
O	Ord	ID[O]==5
P	Pair	ID[P]==4
R	Range	ID[R]==10
{	Set	ID[{]==11
%	Str	ID[%]==7
U	Upper	ID[U]==8
NameList=|#:1|I:2|$:3|P:4|O:5|A:6|%:7|U:8|@:9|R:10|{:11|	11


List Ct(ConnectType)	Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|
Action	Action	ID[Action]==3
DB	DB	ID[DB]==5
Data	Data	ID[Data]==1
Event	Event	ID[Event]==2
Queue	Queue	ID[Queue]==4
Remote	Remote	ID[Remote]==7
Retail	Retail	ID[Retail]==8
SQL	SQLite	ID[SQL]==6
NameList=|Data:1|Event:2|Action:3|Queue:4|DB:5|SQL:6|Remote:7|Retail:8|	8


List Lt(ListType)	Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|
Ac	Action	ID[Ac]==3
Dt	DataType	ID[Dt]==1
Ev	Event	ID[Ev]==2
Lg	Language	ID[Lg]==9
Mt	MessageType	ID[Mt]==8
Pr	Process	ID[Pr]==7
Rt	Return	ID[Rt]==4
Td	TileDef	ID[Td]==5
Ts	TileSize	ID[Ts]==6
NameList=|Dt:1|Ev:2|Ac:3|Rt:4|Td:5|Ts:6|Pr:7|Mt:8|Lg:9|	9


List Dt(DataType)	Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|
String	Free format string	ID[String]==1
Integer	Whole Number	ID[Integer]==2
Number	Whole or Real Number	ID[Number]==3
NameList=|String:1|Integer:2|Number:3|	3


List Ev(Event)	Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|
Click	Click	ID[Click]==1
DblClick	DblClick	ID[DblClick]==4
Drag	Drag	ID[Drag]==7
Drop	Drop	ID[Drop]==6
Enter	Enter	ID[Enter]==2
Exit	Exit	ID[Exit]==3
Swipe	Swipe	ID[Swipe]==5
NameList=|Click:1|Enter:2|Exit:3|DblClick:4|Swipe:5|Drop:6|Drag:7|	7


List Rt(Return)	Rt:Return|Ok|Fail|Equal|Unequal|Queue|
Equal	Equal	ID[Equal]==3
Fail	Fail	ID[Fail]==2
Ok	Ok	ID[Ok]==1
Queue	Queue	ID[Queue]==5
Unequal	Unequal	ID[Unequal]==4
NameList=|Ok:1|Fail:2|Equal:3|Unequal:4|Queue:5|	5


List Td(TileDef)	Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|
Btn	Btn	ID[Btn]==4
Img	Img	ID[Img]==5
LnEdit	LnEdit	ID[LnEdit]==2
Tile	Tile	ID[Tile]==1
TxtEdit	TxtEdit	ID[TxtEdit]==3
Video	Video	ID[Video]==6
NameList=|Tile:1|LnEdit:2|TxtEdit:3|Btn:4|Img:5|Video:6|	6


List Ts(TileSize)	Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|
B	Bottom	ID[B]==5
BL	Bottom Left	ID[BL]==6
BR	Bottom Right	ID[BR]==7
Fixed	Fixed	ID[Fixed]==1
L	Left	ID[L]==8
R	Right	ID[R]==9
SH	Shared	ID[SH]==10
T	Top	ID[T]==2
TL	Top Left	ID[TL]==3
TR	Top Right	ID[TR]==4
NameList=|Fixed:1|T:2|TL:3|TR:4|B:5|BL:6|BR:7|L:8|R:9|SH:10|	10


List Pr(Process)	Pr:Process|Init|Read|Set|Clear|Default|
Clear	Clear	ID[Clear]==4
Default	Default	ID[Default]==5
Init	Init	ID[Init]==1
Read	Read	ID[Read]==2
Set	Set	ID[Set]==3
NameList=|Init:1|Read:2|Set:3|Clear:4|Default:5|	5


List Mt(MessageType)	Mt:MessageType|Input|Output|Event|Trigger|Action|
Action	Action	ID[Action]==5
Event	Event	ID[Event]==3
Input	Input	ID[Input]==1
Output	Output	ID[Output]==2
Trigger	Trigger	ID[Trigger]==4
NameList=|Input:1|Output:2|Event:3|Trigger:4|Action:5|	5


List Ac(Action)	Ac:Action|Init|Timer|Login|Logout|
Init	Init	ID[Init]==1
Login	Login	ID[Login]==3
Logout	Logout	ID[Logout]==4
Timer	Timer	ID[Timer]==2
NameList=|Init:1|Timer:2|Login:3|Logout:4|	4


List Lg(Language)	Lg:Language|En:English|Es:Espanol|Cn:Chinese|
Cn	Chinese	ID[Cn]==3
En	English	ID[En]==1
Es	Espanol	ID[Es]==2
NameList=|En:1|Es:2|Cn:3|	3


List Cy(Country)	Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|
CA	Canada	ID[CA]==3
IN	India	ID[IN]==5
RU	Russia	ID[RU]==4
UK	United Kingdom	ID[UK]==2
US	United States	ID[US]==1
NameList=|US:1|UK:2|CA:3|RU:4|IN:5|	5


List Test(Test)	Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|
Cost	~$~Dollar Price	ID[Cost]==3
NameF	~%12~First Name	ID[NameF]==1
XY	~P~XY Dim	ID[XY]==2
NameList=|NameF:1|XY:2|Cost:3|	3

 Dump of LongList...
T	a|name:Full|	s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|	
 T	a|name:Top|	

 End of LongList Dump.  
LongList Name=T	a|name Desc=Full|	s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|	


T		1.level=0 parent=0 prev=0 next=11 first=2 last=10 #=10 TileID=T
		 List.Name=a=a|name:Full|
		 List.Name=s=s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|
 T		2.level=1 parent=1 prev=0 next=7 first=3 last=6 #=5 TileID=T
		 List.Name=a=a|name:Top|
		 List.Name=s=s|background:magenta|min-height:150px|
  T		3.level=2 parent=2 prev=0 next=6 first=4 last=5 #=3 TileID=T
		 List.Name=a=a|name:Left|
		 List.Name=s=s|background:green|min-width:100px|
   T		4.level=3 parent=3 prev=0 next=5 first=0 last=4 #=1 TileID=T
		 List.Name=a=a|name:Top|
		 List.Name=s=s|background:magenta|min-height:50px|
   T		5.level=3 parent=3 prev=4 next=0 first=0 last=5 #=1 TileID=T
		 List.Name=a=a|name:Bottom|
		 List.Name=s=s|background:magenta|min-height:100px|
  T		6.level=2 parent=2 prev=3 next=0 first=0 last=6 #=1 TileID=T
		 List.Name=a=a|name:Right|
		 List.Name=s=s|background:cyan|width:100%|display:flex|
 T		7.level=1 parent=1 prev=2 next=0 first=8 last=10 #=4 TileID=T
		 List.Name=a=a|name:Bottom|
		 List.Name=s=s|display:flex|flex-direction:row|background:white|min-height:350px|
  T		8.level=2 parent=7 prev=0 next=9 first=0 last=8 #=1 TileID=T
		 List.Name=a=a|name:Left|
		 List.Name=s=s|background:green|min-width:100px|
  T		9.level=2 parent=7 prev=8 next=10 first=0 last=9 #=1 TileID=T
		 List.Name=a=a|name:Middle|
		 List.Name=s=s|background:cyan|width:100%|display:flex|
  T		10.level=2 parent=7 prev=9 next=0 first=0 last=10 #=1 TileID=T
		 List.Name=a=a|name:Right|
		 List.Name=s=s|background:yellow|min-width:200px|
@NOLIST@	11.level=0 parent=0 prev=1 next=0 first=0 last=11 #=1 TileID=NONE

*/
// import { loadConfigFromFile } from "vite";
// import TextEditHandler from "../components/TileComponents/TextEditHandler.svelte";

export namespace RS1 {
	export const StrEndBlk='\x1f', StrEndBlkCode=0x1f, EndStr='\x1e', EndStrCode=0x1e;
	export const NILAB = new ArrayBuffer (0);

	const sleep=async (ms=1)=>await new Promise((r)=>setTimeout(r,ms));
	type StoreBuffer = string | ArrayBuffer | Function | undefined;

	export const SysPrefix='/';

	const DelimList='|\t\n\x0b\f\r\x0e\x0f\x10\x11\x12\x13\x14\x15';

	// Spells a delimiter as a human-readable escape sequence.
	// '|' is rendered as \x7c so it never corrupts a qList report.
	export function hSpellDelim(ch: string): string {
		const map: Record<string, string> = {
			'|':    '\\x7c',
			'\t':   '\\t',
			'\n':   '\\n',
			'\x0b': '\\x0b',
			'\f':   '\\f',
			'\r':   '\\r',
			'\x0e': '\\x0e',
			'\x0f': '\\x0f',
			'\x10': '\\x10',
			'\x11': '\\x11',
			'\x12': '\\x12',
			'\x13': '\\x13',
			'\x14': '\\x14',
			'\x15': '\\x15',
		};
		return map[ch] ?? ch;
	}

	type RPArgs = string|number|RSD|string[]|number[]|RSD[];

	export const tNone='',tStr='$',tNum='#',tAB='(',tPack='&',tList='@',tData='^',tRSD='+', tBBI='%',
		tDisk='*',tArray='[',tArrayStr=':[]:', tStrs='$[', tNums='#[', tRSDs='+[', RSDArrayCh='!';


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
	type RSFldData=string|string[]|number|number[]|RSD|RSD[]|UBuf|undefined;
	
	export class PB {	// prefix-buffer
		prefix='';
		bbi?:BBI;
		Fields:RSF[]=[];
		DataRSD?:RSD;
		RSDName = '';
		offset = 0;

		fieldsToPB (Fields : RSF[]) {
			let nBytes = 0, count = 0, first = this.RSDName;
			let prefixes = [first];
		
			for (const F of Fields) {
				if (F) {
					prefixes.push (F.toPrefix ());
					++count;
		
					if (F.BBI)
						nBytes += F.BBI.byteLength;
				}
			}
			prefixes.push (StrEndBlk);


		
			let prefix = prefixes.join (',');

			// console.log (prefixes.length.toString () + ' fieldsToPB='+prefix);

			let prefixBuf = str2bbi (prefix), buf = RS1.newBuf (nBytes + prefixBuf.byteLength),
					offset = prefixBuf.byteLength;
			buf.set (prefixBuf,0);
		
			prefixes = prefixes.slice (0,-1);
			
			let Bufs = Array<BBI> (count);
			let i = 0;
			for (const F of Fields) {
				if (F) {
					//	if ((F.type === tRSD)  &&  (F.Data))
					//		console.log ('  Field ' + (F.Data as RSD).Name + ' Type= ' + F.type + ' Prefix=' + F.prefix);
					//	else console.log ('  Field ' + F.Name + ' Type= ' + F.type + ' Prefix=' + F.prefix);


					let bbi = F.BBI; 
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
		
		bufToPB (Buf : UBuf, start = 0) {
			let end = Buf.indexOf (StrEndBlkCode,start);
			if (end < 0)
				return [];
	
			let offset = end + 1, prefix = bb2str (Buf.slice (start,end));

			let prefixes = prefix.split (',');

			let first = prefixes[0];
			prefixes = prefixes.slice (1,-1);
							
			let colon = first.indexOf (':');
			if (colon >= 0)
					this.RSDName = first.slice (0,colon);
			else if (first)
					this.RSDName = first;

			let count = prefixes.length, Fields = Array<RSF> (count), i = 0;

			for (const P of prefixes) {
				let nBytes = prefixBytes (P), bbi, bbistr ='';
				if (nBytes) {
					bbi = Buf.slice (offset,offset + nBytes);
					offset += nBytes;
					bbistr = bb2str (bbi);
				}
				else bbistr = 'NIL';

				let F = new RSF ();
				F.fromPrefix (P,bbi);
				Fields[i++] = F;
			}
	
			this.bbi = Buf.slice (start,offset);
			this.offset = offset;
			this.Fields = Fields;
			this.prefix = prefix;
		}

		makeRSD () {
			let rsd = newRSD (undefined, this.RSDName);
			FieldsToRSD (this.Fields, rsd);
			return rsd;
		}

		constructor (In : UBuf | RSF[], rsdName:string, start = 0) {
			this.RSDName = rsdName;
			if (In instanceof Uint8Array)
				this.bufToPB (In as UBuf, start)
			else this.fieldsToPB (In as RSF[]);
		}
	}

	export function newBuf (nBytes:number|ArrayBuffer) 
	{
		if (typeof nBytes === 'number')
			return new Uint8Array (nBytes as number);
		else return new Uint8Array (nBytes as ArrayBuffer);
	}


	type RSDT=RSD|undefined;
	type RSArgs=ABI|string[]|RSPack|RSDT|RSDT[]|RSField|ListTypes[]|undefined;

	export class TypedArgs {
		data : RSArgs;
		Type = '';
		ArrayType = '';
		n = 0;
		s = '';
		big = 0n;
		func : Function = zGet$;
		bool = false;

		constructor (In : any) {
			let Type = this.Type = typeof (In);

			switch (Type) {
				case 'number' : this.n = In as number; return;
				case 'string' : this.s = In as string; return;
				case 'bigint' : this.big = In as bigint; return;
				case 'boolean' : this.bool = In as boolean; return;
				case 'symbol' : case 'undefined' : return;
				case 'function' : this.func = In as Function; return;
			}

			// object
			if (Array.isArray (In)) {
				for (const a of (In as any[])) {
					let t = typeof a;

					if (t === 'undefined')
						continue;

					this.ArrayType = t;
					switch (t) {
						case 'string' : case 'number' : case 'boolean' : case 'function' : case 'symbol' :
							this.ArrayType = t; this.Type = t + '[]';
							break;

						case 'object' :
							if (In instanceof RSD)
								this.Type = (this.ArrayType = (In as RSD).cl) + '[]';
					}
				}
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
 // Internal state
    protected _Mom?: RSD;
    protected _bbi?: BBI;
    protected qstr = '|';       // stays protected; mutated through helpers

    protected _K?: RSK;
    protected _Q?: qList;
    protected _R?: rList;

    protected _N?: number[];
    protected _P?: RSPack;
    protected _S?: string[];
    protected _T?: string;
    protected _X?: RSD;
    protected _Data: any;
    protected _BLOB?: UBuf;

    // Read-only traits
    get iList() { return true; }
    get notIList() { return false; }

    get isMom() { return false; }
    get isList() { return false; }
    get cl() { return 'RSD'; }

    // Mom / parent
    get Mom(): RSD | undefined { return this._Mom; }
    set Mom(m: RSD | undefined) {
        this.mark;
        this._Mom = m;
    }

    // Kids/Lists (if you want to wrap these too)
    get K(): RSK | undefined { return this._K; }
    set K(v: RSK | undefined) {
        this.mark;
        this._K = v;
    }

    get Q(): qList | undefined { return this._Q; }
    set Q(v: qList | undefined) {
        this.mark;
        this._Q = v;
    }

    get R(): rList | undefined { return this._R; }
    set R(v: rList | undefined) {
        this.mark;
        this._R = v;
    }

    // Scalar / data fields
    get N(): number[] | undefined { return this._N; }
    set N(v: number[] | undefined) {
        this.mark;
        this._N = v;
    }

    get P(): RSPack | undefined { return this._P; }
    set P(v: RSPack | undefined) {
        this.mark;
        this._P = v;
    }

    get S(): string[] | undefined { return this._S; }
    set S(v: string[] | undefined) {
        this.mark;
        this._S = v;
    }

    get T(): string | undefined { return this._T; }
    set T(v: string | undefined) {
        this.mark;
        this._T = v;
    }

    get X(): RSD | undefined { return this._X; }
    set X(v: RSD | undefined) {
        this.mark;
        this._X = v;
    }

    get Data(): any { return this._Data; }
    set Data(v: any) {
        this.mark;
        this._Data = v;
    }

    get BLOB(): UBuf | undefined { return this._BLOB; }
    set BLOB(v: UBuf | undefined) {
        this.mark;
        this._BLOB = v;
    }

    // Public, read-only view of the buffer (optional)
    get BBI(): BBI {
        return this.toBBI;      // delegates to your existing toBBI getter
    }
	_setBBI (bbi : BBI) { this._bbi = bbi; }

    // Existing dirty flag
    get dirty() {
        return this._bbi !== undefined;
    }

    get mark() {
        this._bbi = undefined;
        return true;
    }

		copy (NewName = '') : RSD {
			let pb = this.toPB ();
			let newRS = newRSD (pb.bbi, this.cl);
			if (NewName)
				newRS.Name = NewName;
			return newRS;
		}
	
		get Name () { 
			return (this instanceof xList) ? this.listName : this.qGet ('Name@');
		}
		set Name (N:string) {
			if (this instanceof xList) {
				let ND = this.getNameDesc ();
				this.setNameDesc (N, ND.b);
			}
			else this.qSet ('Name',N);
		}

		get Desc () { return zGet$ (this.qstr, 'Desc'); }
		set Desc (N:string) {
			this.qSet (':Desc',N);
		}

		get Group () { return zGet$ (this.qstr, 'Group'); }
		set Group (N:string) {
			this.qSet (':Group',N);
		}

		get Type () {
			let cl = this.cl;

			if (cl.indexOf ('List') >= 0)
				return 'List';

			switch (cl) {
				case 'Bead' : case 'RSD' : case 'TileDef' : return cl;
			}
			
			return zGet$ (this.qstr, 'Type');
		}

		set Type (N:string) {
			if (!this.Type)
				this.qSet (':Type',N);
		}

		get Sub () { return zGet$ (this.qstr,'Sub'); }
		set Sub (N:string) {
			this.qSet (':Sub',N);
		}

		get Error () { return this.qGet (':Error'); }
		set Error (N:string) { this.qSet (':Error',N); }

		get Count () {
			if (this.K)
				return this.kidCount (true);
			return this.qCount;
		}

		get DBqList () {
			return '|_Name:' + this.Name + '|_Desc:' + this.Desc + '|_Type:' + this.Type + '|_RSD:' + this.cl +
				'|_Count:' + this.Count + '|_Tile:' + zGet$ (this.qstr, 'Tile') + '|';
		}

		get sum () {
			this.mark;
			return checksumBuf (this.toBBI);
		}

		get clear () {
			this.qstr = '|';

			if (this._K)
				this._K.clear;
			
			if (this._Q)
				this._Q.clear;
			
			if (this._R)
				this._R.clear;
			
			if (this._N)
				this._N = [];
			if (this._P)
				this._P.clear;
			
			if (this._S)
				this._S = [];
			
			if (this._T)
				this._T = '';
			
			if (this._X)
				this._X.clear;
			
			if (this._Data)
				this._Data = undefined;

			this.mark;
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

			return this.Q || this.R || this.N ||  this.P  || this.S ||  this.T || this.X  ||  this.Data  ||  this.BLOB;
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

			lines += '] CS=' + checkSumStr (this.qstr);
			if (this.kidCount (true))
				lines += '  Kids =' + this.kidCount (true).toString ();
			return lines;
		}

		get expand () {
			let lines = this.info, count = 0, k = this.K;
			
			if (this.BLOB)
				lines += '\n  BLOB=' + bb2str (this.BLOB) + ' Bytes=' + this.BLOB.byteLength.toString ();

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

					// console.log('str.length:', str.length, 'str:', JSON.stringify(str));
					// console.log('last:', JSON.stringify(last), 'first:', JSON.stringify(first));

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

		fromPB(pb: PB) {
			// Option A: overwrite this instance from pb.Fields
			FieldsToRSD(pb.Fields, this);
		}

		protected toPB(): PB {
			const pb = RSDToPB(this);   // uses RSDToFields internally
			// RSDToPB already sets pb.RSDName = this.cl and this._bbi = pb.bbi
			return pb;
		}

		fromBuf(Buf: UBuf) {
			const pb = new PB(Buf, this.cl);
			FieldsToRSD(pb.Fields, this);   // centralized logic
		}

		get toBBI () {
			if (this._bbi)
				return this._bbi;
			else {
				let newPB = this.toPB ();
				return this._bbi = newPB.bbi as UBuf;
			}
		}



		toPrefix () {
			let bbi, prefix;
			if (!(bbi = this._bbi)) {
				let pb = this.toPB ();
				if (!pb  ||  !(bbi = pb.bbi))
					return '';
			}

			let	cName = '[' + this.cl + ']';
			
			let str = tRSD + cName + this.Name + ':' + bbi.length;
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
						//	console.log ('ConstructRSD bytes = ' +
//							(In as Uint8Array).byteLength.toString ());
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
		qGetStrNull (s:string) {
			let pos = this.qFindName (s);
			if (pos < 0)
				return null;

			let endpos = this.qstr.indexOf ('|',pos);
			if (endpos < 0)
				return null;
			
			let str = this.qstr.slice (pos, endpos), colon = this.qstr.indexOf (':');
			if (colon >= 0) 
				return str.slice (colon+1)
			else return str;
		}
		
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
			if (++nPos > 0)
				return nPos;

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
				x = (xq as string).split ('|').slice (1,-1);
			else {
				let split = (xq as xList).qSplitNames;
				x = split.a;
			}

			let split = this.qSplitNames, count = 0, newRaw = [];
			for (const s of x) {
				if (s) {
					let i = split.a.indexOf (s);
					if (i >= 0) {
						newRaw.push (s + ':' + split.b[i]);
						++count;
					}
				}
			}

			let newList = count ? new qList ('|' + newRaw.join ('|') + '|') : new qList ();
			//	console.log ('qExtract =' + newList.to$ + ', extractList=' + x.join ('|'));
			return newList;
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
						// console.log ('qList merge target = ' + (target as qList).expand);
						// console.log ('qList merge incoming = ' + rsi.expand);
						(target as qList).qMerge (rsi);
						// console.log ('qList target after merge = ' + (target as qList).expand);
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
						// console.log ('rList ' + this.qstr + ' created: ' + this.info);
					}
					return;
				default : Strs = [];
			}

			if (!Strs.length) {
				// console.log ('rList ' + this.qstr + ' created: ' + this.info);
				return;
			}

			let first = Strs[0];
			if (isDelim (first.slice(-1))) {
				this.rAddList (Strs);
				// console.log ('rList ' + this.qstr + ' created: ' + this.info);
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
				// console.log ('  ND=' + ND + '.');
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


		objectIn (O : Object) {
			let Buf : BBI;
			this.clear;
			
			let entries = Object.entries (O), Strs = [], raw, count=0;

			for (let entry of entries) {
				let value = entry[1], Type = typeof (value);

				switch (Type) {
					case 'string' : case 'number' : Strs.push (entry[0] + ':' + entry[1]); break;
					case 'object' :
						if (Array.isArray (value)) {
						}
						else if (value instanceof Uint8Array) {
							Buf = this.BLOB = value;
						}
						break;
				}
				// console.log ('   AddArray[' + count.toString () + '] entry = ' + entry);
				++count;
			}
			this.mark;

			this.qFromRaw (Strs);
			return Buf;
		}

		objectOut () : Object {
			let o = new Object (), Raws = this.qToRaw, Type, colon;

			for (const r of Raws) {
				let colon = r.indexOf (':'), name, desc;
				if (colon >= 0) 
				{	name = r.slice (0,colon); desc = r.slice (colon+1);	}
				else {	name = r; desc = '';	}

				Object.assign (o, { name : desc });
			}

			if (this.BLOB)
				Object.assign (o, { 'BLOB' : this.BLOB });

			console.log ('New Object = ' + o);
			return o; 
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
		BLOB : BBI;
		commands : string[] = [];

		constructor (rsd : RSD, direction='>>', serving = true) {
			let qstr = rsd.qGetQStr, pos = qstr.indexOf ('|_#:'), serial='', colon = -1, 
				commands, endpos, cmdstr;

			if (pos >= 0) {
				serial = qstr.slice (pos + 4);
				// console.log ('serial1=' + serial);
				endpos = serial.indexOf ('|');
				if (endpos >= 0)
					serial = this.NumberStr = serial.slice (0,endpos);
				// console.log ('serial2 =' + serial);
			}
			colon = serial.indexOf (':');

			// console.log ('NumberStr=' + this.NumberStr);
			if (this.NumberStr) {
				if (colon >= 0) {
					this.SessionID = Number (this.SessionStr = serial.slice (colon + 1));
					this.SerialID = Number (this.SerialIDStr = serial.slice (0,colon));
				}
				else this.SerialID = Number (this.SerialIDStr = serial);
			}

			let cmdpos = qstr.indexOf ('|' + (serving ? '?' : '.'));	// find the FIRST command
			if (cmdpos >= 0) {
				endpos = qstr.indexOf ('|', ++cmdpos);
				//	console.log ('cmdstr0=' + qstr.slice (cmdpos));
				cmdstr = qstr.slice (cmdpos, endpos >= 0 ? endpos : -1);

				commands = cmdstr.split (':');
				this.command = commands[0];
				this.cmdXtra = commands[1];
				commands = commands.slice (1);
			}
			else commands = [];

			console.log ('\n' + direction + ' Message #' + this.SerialIDStr + '/' + this.SerialID.toString () +' RSD=' + rsd.to$ + 
			' Session=' + this.SessionStr + '/' + this.SessionID.toString () + ' sum=' + rsd.sum +
		 		'\n  CmdStr = ' + this.cmdstr + ' CmdXtra = ' + this.cmdXtra + ' NumberStr =' + this.NumberStr);
			if (this.BLOB) {
				console.log ('  BLOB Bytes=' + this.BLOB.byteLength + ', sum=' + checksumBuf (this.BLOB));
			}
		}
	}

	export function newRSD (x:RSArgs=undefined,name='') : RSD {
		let R = undefined;

		if (!name) {
			let Type = typeof (x), str;
			if (Type === 'object') {
				let bbi;

				if (x instanceof ArrayBuffer) 
					bbi = new Uint8Array (x as ArrayBuffer);
				else if (x instanceof Uint8Array) 
					bbi = x as Uint8Array;

				if (bbi) {
					str = bb2str (bbi.slice (0,199));
//					console.log ('newRSD, BBI =' + str);
				}

			}
			else if (Type === 'string')
					str = (x as string).slice (0,49);

			if (str) {
				let comma = str.indexOf (',');
				if (comma >= 0) {
					let nameStr = str.slice (0,comma), colon = nameStr.indexOf (':');
					name = (colon >= 0) ? nameStr.slice (0,colon) : nameStr;
				}
			}
		}

		switch (name) {
			case 'RSD' : return new RSD (x);
			case 'rList' : return new xList (x);
			case 'qList' : return new qList (x);
			case 'RSLeaf' : return new RSLeaf (x as RSD);
			case 'RSTree' : return new RSTree (x as RSD);
			case 'RSr' : return new rList (x  as string|string[]|ListTypes[]);
			case 'RSR' : return new RSR (x);
			case 'Bead' : return new Bead (x);
			case 'rLOL' : return new rLOL (x as string|string[]|ListTypes[]);
			case 'TDE' : return new TDE (x as string|rList);
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
		constructor () {
			super ();
			this._K = new RSK (this);
		}

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
	export var mySerial=0;
	export var xmySession=0;		// this is the LAST session # on the server
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
		get isList () { return true; }

		get Name () { return this.listName; }
		get Desc () {
			let pair = this.namedesc ();

			return pair.b;
		}
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
					else if (data instanceof Uint8Array) {
						return this.type = tBBI;
					}
					else {
						this.RSDName = (rsd = data as RSD).cl;
						return this.type = tRSD;
					}

					this.arr = true;
					
					if (!conName) {
						if (data instanceof Uint8Array)
							conName = 'UBuf';
						else {
							let Q = data as Array<any>;
							for (const q of Q)
								if (q) {
									conName = typeof q;
									if ((conName !== 'string')  &&  (conName !== 'number'))
										conName = (q as RSD).cl;

									break;
								}
						}
					}

					switch (conName) {
						case '' : this.type = tStrs; data = undefined; return;
						case tStr : case 'tStrs' : case 'string' : return this.type = tStrs; return;
						case tNum : case 'tNums' : case 'number' : return this.type = tNums; return;
						case tBBI : return this.RSDName = conName; this.type = tBBI; return;
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
					let rsd = this.Data as RSD, rPrefix = rsd.toPrefix ();
					
					bbi = rsd.BBI;
					arrStr = '[' + rsd.cl + ']';
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

				case tBBI:
					bbi = newBuf ((this.Data as UBuf).byteLength);
					bbi.set (this.Data as UBuf);
					break;

				case tRSDs:
					let Arr = this.Data as RSD[];
					let dims = '', nBytes = 0,	offset = 0, count = 0, Ps:string[]=[], Bs:BBI[]=[];
					for (const r of Arr)
						if (r) {
							let pre = r.toPrefix (), bb = r.BBI;

							Ps.push (r.toPrefix ());
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
			//	console.log ('RSF.toPrefix: ^^' + this.prefix);
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

					case tBBI :
						this.Data = newBuf (bbi.byteLength);
						(this.Data as UBuf).set (bbi);
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
		constructor (Args : RSArgs) {
			super (Args);
			this.Q = new qList ();
		}

		get cl () { return 'RSQ'; }
	}


	export class RSR extends qList {
		constructor (Args : RSArgs) {
			super (Args);
			this.R = new rList ();
		}
		get cl () { return 'RSR'; }

		get to$$ () : string [] {
			return this.R ? this.R.to$$ : [];
		}
	}

	export class Bead extends RSR {
		constructor (Args : RSArgs) {
			super (Args);
			this.Q = new qList ();
			this.R = new rList ();
			this.K = new RSK (this);
		}

		get cl () { return 'Bead'; }

		private get toStrPrefix () {
			// let q = this.q.toS, r = this.r.toS;
			// return '$' + q.length.toString () + ',' + r.length.toString () + '$' + q + r;
			return '$';
		}
	}

	export class rList extends xList {
		constructor (In? : RSArgs, name = '', desc = '') {
			super (In);
			this.K = new RSK (this);
			this.rConstruct (In, name, desc);
		}
		
		get iList () { return false; }
		get notIList () { return true; }

		get cl () { return 'rList'; }
		get isList () { return true; }
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
			if (NewName) {
				list.setNameDesc (list.listName, NewName);
			}
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

		SaveLists () {
			let k = this.K;

			if (k) for (const L of k._kids) {
				if (L)
					DBInsert (L);
			}
		}
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



	export class RID {	// Relational ID = record,tile,villa,world
						// where each can be string or numeric ID
						//	,db,Oracle   is "db" tile in "Oracle" villa
						//	,db	is "db" tile in current villa
						//	123 is recordID 123 in current villa
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

			let K = List1.K;
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

			let NewBuf = BP.bufOut ();
			let Check1 = ChkBuf (NewBuf);

			BP.bufIn (NewBuf);

			NewBuf = BP.bufOut ();
			let Check2 = ChkBuf (NewBuf);


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
		prefix='';
		RSDName = '';
		KidName = '';
		
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

		addData (data:RSFldData, name='') {
			let Field = new RSF ();

			Field.setData (data);
			if (name)
				Field.setName (name);

			this.addField (Field);
			return Field;
		}

		toBuf () {
			let k = this.K, Kids, nBytes = 0, count = 0;
			if (k)
				Kids = k._kids;
			else return undefined;

			let first = this.cl;
			let prefixes = [first];

			for (const F of Kids) {
				if (F) {
					prefixes.push (F.toPrefix ());
					++count;

					if (F.BBI)
						nBytes += F.BBI.byteLength;
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
					Bufs[i++] = F.BBI;
					if (F.BBI  &&  F.BBI.byteLength) {
						buf.set (F.BBI, offset);
						offset += F.BBI.byteLength;
					}
				}
			}

			if (offset !== buf.byteLength)
				throw "Buf length mismatch!";

			return this._bbi = buf;
		}

		fromBBI (buf : BBI) {
			if (!buf)
				return;

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

		fromFields (Fields:RSF[]) {
			let k = this.K;
			if (k)
				k.setKids (Fields);

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
			}

			this.addArgs (AddArray);
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

	export function zGet$ (z:string, name:string, start=0)
	{
		let namestr = '|_' + name + ':', len = namestr.length, pos = z.indexOf (namestr,start);
		if (pos >= 0) {
			pos += len;
			let endpos = z.indexOf ('|', pos);
			if (endpos >= 0)
				return z.slice (pos, endpos);
			else return z.slice (pos);	// no terminating |, should not happen
		}

		return '';
	}

	export function zSet$ (z:string, name:string, newValue:string|number, start=0) {
		let namestr = '|_' + name + ':', len = namestr.length, pos = z.indexOf (namestr,start);

		if (pos >= 0) {
			pos += len;
			let endpos = z.indexOf ('|', pos);
			return z.slice (0,pos) + newValue.toString () + z.slice (endpos);
		}

		return z;	// unchanged
	}

	//	qList functions, free standing

	export function	qExtract (source : string|qList, extract : string|qList) : string {
			let src = (typeof source === 'string') ? source as string : (source as qList).qGetQStr;
			let sourceRaw = src.split ('|').slice (1,-1), newRaw = [];
			let ext = (typeof extract === 'string') ? extract as string : (extract as qList).qGetQStr;
			let extractNames = ext.split ('|').slice (1,-1);

			for (const s of sourceRaw) {
				let colon = s.indexOf (':'), name = (colon >= 0) ? s.slice (0,colon) : s;

				let i = extractNames.indexOf (name);
				if (i >= 0)
					newRaw.push (s);
			}

			return newRaw.length ? '|' + newRaw.join ('|') + '|' : '|';
	}







	export function checkSumStr (input: string): string {
		let hash = 0 >>> 0; // force unsigned 32-bit

		for (let i = 0; i < input.length; i++) {
			hash = (hash + input.charCodeAt(i)) >>> 0;
			// simple mixing
			hash = (hash + ((hash << 10) >>> 0)) >>> 0;
			hash ^= hash >>> 6;
		}

		// final avalanche
		hash = (hash + ((hash << 3) >>> 0)) >>> 0;
		hash ^= hash >>> 11;
		hash = (hash + ((hash << 15) >>> 0)) >>> 0;

		// convert to 8-char hex
		return hash.toString(16).toUpperCase().padStart(8, "0");
	}

	export function checksumBuf (data: UBuf): string {
  		let sum = 0 >>> 0;  // ensure unsigned 32-bit
  		for (let i = 0; i < data.length; i++)
    		sum = (sum + data[i]) >>> 0;  // keep it in 0..2^32-1

		return sum.toString (16);
	}

	export function BuildQ (rsd : RS1.RSD) : any[] {
		let list = rsd.qGetQStr, first = list.indexOf ('|?'), qType = list.slice (first);
		if (first < 0)
		{
			rsd.T = '';
			return [];
		}

		qType = list[first+2];

		let Raw = rsd.qToRaw, IDs = '';
		let table = 'S', tile = '', ID = '';		// default Table Name (if not specified)
		let Type = '', SQLCmd, Wheres:string[]=[];
		let qStr = '', vStr = '', Name, Values : any[] =[], Names : string[] = [];

		for (const r of Raw) {
			if (!r)
				continue;

			let vName, first, vDesc, str, colon = r.indexOf (':'), special = (r[0] === '_');
			if (special) {
				if (colon >= 0) {
					vName = r.slice (1,colon); vDesc = r.slice (colon+1);
					switch (vName) {
						case 'ID' : 
							if (vDesc) {
								ID = vDesc; 
								Wheres.push ("(ID = " + vDesc + ")");
							}
							continue;

						case 'IDs' : IDs = vDesc; Wheres.push ('(ID in (' + IDs + '))');

						case 'Tile' :
							if (vDesc) {
								tile = vDesc; 
								Wheres.push ('Tile = ' + vDesc);
							}
							continue;
						case 'Table' : table = vDesc; continue;
						case '#' : continue;	// ignore the # tag, not for us

						// field string comparison case

						default :
							if (qType === 'I') {
								qStr += vName + ',';
								vStr += '?,';
							}
							else {
								qStr += vName + '=?,';
							}
							Values.push (vDesc);
					}
				}
				else { vName = r.slice (1); vDesc = '';	}
				continue;
			}
			else {
				if (colon >= 0) {
					vName = r.slice (0,colon);
					vDesc = r.slice (colon+1);					
				}
				else {	vName = r; vDesc = '';	}
			}

			if ((first = vName[0]) < 'A')	{	// not a legal field name, must be control
				if (first === '?') {
					switch (vName[1]) {
						case '?' : Wheres.push (vName.slice (2) + '=' + vDesc);	break;
						case 'T' : case 'G' : case 'C' :
							switch (vName[1]) {
								case 'T' : str = 'Type'; break;
								case 'G' : str = 'Group'; break;
								case 'C' : str = 'Class'; break;
							}
							Wheres.push (str + "='" + vDesc + "'");
							break;

						case 'Q' :	
							switch (qType = vDesc[0]) {
								case 'I'	: SQLCmd = 'INSERT '; break;
								case 'S'	: SQLCmd = 'SELECT '; break;
								case 'U'	: SQLCmd = 'UPDATE '; break;
								case 'D'	: SQLCmd = 'DELETE '; break;
								default : qType = 'ABC Error!';
							}
							break;

						default : console.log ('Ignoring this line');
					}
				}
			}
			else {
				if (first === '_') {
					vName = vName.slice (1);
				}
				if (qType === 'I') {
					qStr += vName + ',';
					vStr += '?,';
				}
				else {
					qStr += vName + '=?,';
				}
				Values.push (vDesc);
			}
		}

		switch (qType) {
			case 'U' :
				qStr += 'BLOB=?,';
				Values.push (rsd.BLOB = rsd.toBBI);
				break;
			
			case 'I' : 
				let Now = Date.now ();
				Values.push (Now, Now, 1, 1, rsd.qGetQStr, rsd.BLOB = rsd.toBBI);
				qStr += 'Created,Changed,Owner,Creator,qstr,BLOB,';
				vStr += '?,?,?,?,?,?,';
				break;
		}

		vStr = vStr.slice (0,-1); qStr = qStr.slice (0,-1);

		if (Wheres.length)
			console.log ('Wheres =' + Wheres.join ('&'));


		switch (qType) {
			case	'I'	:
				qStr = 'INSERT INTO ' + table + ' (' + qStr + 
						') VALUES (' + vStr + ')';

				//	console.log ('\n\n\n\nqstr =' + qStr + ', Values=' + Values);
				break;

			case	'U' :
				qStr = 'UPDATE ' + table + ' SET ' + qStr + ' WHERE ';
				qStr += Wheres.join (' AND ') + ';';
				break;

			case	'D'	:
				if (IDs)
					qStr = 'DELETE FROM ' + table + ' WHERE ID in (' + IDs + ');'
				else {
					qStr = 'DELETE FROM ' + table + ' WHERE ID = ' + ID + ';';
				}
				Values = [];	// no pushed values need, zero if present
				break;

			case	'S'	:
				qStr = 'SELECT blob FROM ' + table;
				if (Wheres.length)
					qStr += ' WHERE ' + Wheres.join (' AND ') + ';';
				else qStr += ';';
				Values = [];	// no pushed values need, zero if present
				break;

			default :
				qStr = 'Error:&&qType=' + qType + '&&' + SQLCmd + table + ' SET (' + qStr + ') VALUES (' + vStr + ') WHERE ID=' + ID.toString () + ';';
				break;
		}
/*
		console.log ('I/U qStr =' + qStr + ' ... vStr =' + vStr );

		console.log ('buildQ nValues = ' + Values.length.toString ());
		console.log ('qStr=' + qStr + '  ... vStr =' + vStr);
		for (const v of Values)
			console.log ('  Value=' + v);
*/

		rsd.T = qStr;

		return Values;
	}

	export function newClientStr (CmdList = '') { 
		return CmdList + '|_#:' + (++mySerial).toString () + ':' + xmySession.toString () + '|';
	}

	export function newClientRSD (CmdList = '', rsd? : RSD) {
		let x, newRSD = new RSD (x = newClientStr (CmdList) + rsd?.DBqList);
		if (rsd) {
			newRSD.BLOB = rsd.toBBI; 
			newRSD.mark;
		}

		// console.log ('\n\n\n    newClientStr=' + x + ' , to$=' + rsd?.DBqList);
		return newRSD;
	}

	export async function DBSelect (IDOrStr :number|string = '|Type:List|') {
		let Arg = new TypedArgs (IDOrStr), rsd;

		if (typeof IDOrStr === 'string')
			rsd = newClientRSD ('|?Q:S' + IDOrStr);
		else // number
			rsd = newClientRSD ('|?Q:S' + '|_ID:' + IDOrStr + '|');

		let outRSD = await ReqRSD (rsd);
		return outRSD.BLOB ? RS1.BufToRSDs (outRSD.BLOB) : [];
	}

	export function DBUpdate (rsd:RSD) {
		let ID = rsd.qGetNum (':ID');
		if (!ID) 
			return DBInsert (rsd);

		let OutRSD = newClientRSD ('|?Q:U|_ID:' + ID + '|', rsd);
		return ReqRSD (OutRSD);		
	}

	export function DBDelete (IDorRSD:number|number[]|RSD) {
		let ID = 0, In = new TypedArgs (IDorRSD);
		switch (In.Type) {
			case 'number[]' : 
				let IDs = IDorRSD as number[];
				if (!IDs.length)
					return;
				let IDstr = '|?Q:D|_IDs:';
				for (const id of IDs)
					if (id)
						IDstr += id.toString () + ',';

				let OutRSD = newClientRSD  (IDstr.slice (0,-1) + '|');
				return ReqRSD (OutRSD);
				break;
			case 'number' : ID = (IDorRSD as number); break;
			default : // RSD
				ID = (IDorRSD as RSD).qGetNum (':ID');
		}

		let OutRSD = newClientRSD ('|?Q:D|_ID:' + ID + '|');
		return ReqRSD (OutRSD);
	}

	export function DBInsert (rsd:RSD) {
		let ID = rsd.qGet (':ID');
		if (!ID  ||  ID == '0') {
			let OutRSD = newClientRSD ('|?Q:I|_ID:',rsd);
			return ReqRSD (OutRSD);
		}
	}

	export function RSDsToBuf (RSDs:RSD[]) {
		let len = RSDs.length, BBIs = Array<UBuf> (len), Prefixes = Array<string> (len), 
			totalBytes = 0, count = 0, bbi, prefix, offset, result, nBytes;

		for (const rsd of RSDs) 
			if (rsd) {
				prefix = Prefixes[count] = rsd.toPrefix ();
				bbi = BBIs[count++] = rsd.toBBI as UBuf;
				totalBytes += bbi.byteLength;
			}

		prefix = Prefixes.join (',') + ',' + StrEndBlk;
		result = newBuf (totalBytes += (offset = prefix.length));
		result.set (str2bbi (prefix));
		for (let i = 0; i < count;) {
			nBytes = BBIs[i].byteLength;
			result.set (BBIs[i++], offset);
			offset += nBytes;
		}

		if (offset !== totalBytes)
			throw 'offset/totalBytes mismatch!';

		return result;
	}


	export function BufToRSDs (Buf : UBuf) {
		let end = Buf.indexOf (StrEndBlkCode), prefix = bb2str (Buf.slice (0,end));
//		console.log ('BufToRSDs Bytes = ' + Buf.byteLength + ', sum=' + checksumBuf (Buf) + 'Buf=\n' + bb2str (Buf));
		let offset = end + 1, totalBytes = Buf.byteLength, RSDs:RSD[] = [], count = 0;

		while (offset < totalBytes) {
			const pb = new PB(Buf, '', offset);
			if (!(offset = pb.offset))
				break;
			RSDs.push(PBToRSD(pb));
		}

		return RSDs;
	}



	export function FieldsToRSD (Fields : RSF[], rsd : RSD) {
		let k = rsd.K;
		if (k)
			k.clear;

		for (const field of Fields) {
			let name = field.name;

			switch (name) {
				case '.$' : rsd.from$ (field.Data as string); break;
				case '.x' : rsd.X = field.Data as RSD; break;
				case '.p' : rsd.P = field.Data as RSPack; break;
				case '.b' : rsd.BLOB = field.Data as UBuf; break;
				case '.n' : rsd.N = field.Data as number[]; break;
				case '.d' : rsd.Data = field.Data; break;
				default : if (k  &&  name  &&  name[0] != '.')
					k.add (field.Data as RSD,false);
			}
		}

		rsd.mark;
	}

	export function RSDToFields (rsd : RSD) {
		let Str;
		
		Str = rsd.to$;
		
		let k = rsd.K, x = rsd.X, p = rsd.P;

		let cName = rsd.cl, fldPack = (cName === 'RSPack'), Fields:RSF[] = [], field;

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

		if (rsd.N) {	// number array!
				field = new RSF ();
				field.setData (rsd.N);
				field.setName ('.n');
				Fields.push (field);
		}

		if (rsd.Data) {
			field = new RSF();
			field.setData(rsd.Data);
			field.setName('.d');
			Fields.push(field);
		}		

		if (rsd.BLOB) {
				field = new RSF ();
				field.setName ('.b');
				field.setData (rsd.BLOB,'Uint8Array');
				Fields.push (field);
		}

		if (k  &&  !(rsd instanceof xList)) {	// xList directly puts includes kids in to$
			let Kids = k._kids;
			for (const Kid of Kids) {
				if (Kid) {
					if (fldPack)
						// need to duplicate the field, not copy it by reference
						Fields.push ((Kid as unknown) as RSF);
					else {
						field = new RSF ();
						field.setData (Kid, Kid.cl);
						field.setName (Kid.Name);
						Fields.push (field);
					}
				}
			}
		}

		return Fields;
	}

	export function RSDToPB(rsd: RSD) {
		const Fields = RSDToFields(rsd);
		let newPB  = new PB(Fields,rsd.cl);
		newPB.RSDName = rsd.cl;		// later, if creating RSD from this PB,
									// I must know the name of the RSD to create!
		rsd._setBBI (newPB.bbi);
		return newPB;
	}

	export function PBToRSD(newPB: PB): RSD {
		return newRSD(newPB.bbi, newPB.RSDName);
	}

	// hList functions

	// ─── hList accessor functions ────────────────────────────────────────────────
	// These replace zGet/zSet/zDel and work at ANY hList level, not just qstr (|)

	/**
	 * Count primary-level elements.  hCount(qstr) = qCount.
	 */
	function hCount(hstr: string): number {
		return hRaw(hstr).length;
	}

	// Works on ANY level — qList, zLine, zList, or deeper
	function hFind(str: string, name: string) {
		const d = str.slice(-1);
		const search = d + name;	// save this add for both
		let pos = str.indexOf(search + ':');
		return (pos >= 0) ? pos : str.indexOf(search + d);
	}

	// Base primitive — undefined means NOT FOUND, '' means found with no value
	function hGetOrNIL(str: string, name: string): string | undefined {
		const pos = hFind(str, name);
		if (pos < 0) return undefined;
		const d   = str.slice(-1);
		const end = str.indexOf(d, pos + 1);         // pos points to leading delim
		const raw = end >= 0 ? str.slice(pos + 1, end) : str.slice(pos + 1);
		const colon = raw.indexOf(':');
		return colon >= 0 ? raw.slice(colon + 1) : ''; // '' for bare name
	}

	// '' for not found OR bare name — use hGetOrNIL when you need to distinguish
	function hGet(str: string, name: string): string {
		return hGetOrNIL(str, name) ?? '';
	}

	// NaN if not found;  0 if bare name (found, no value);  Number(val) otherwise
	function hGetNum(str: string, name: string): number {
		return Number(hGetOrNIL(str, name));           // Number(undefined) = NaN ✓
	}

	// undefined if not found OR if value IS numeric;  string (incl. '') otherwise
	// Useful when a field might hold either a label or a number
	function hGetStrNIL(str: string, name: string): string | undefined {
		const val = hGetOrNIL(str, name);
		if (val === undefined) return undefined;       // not found
		if (val !== '' && !isNaN(Number(val))) return undefined;  // numeric value
		return val;                                    // '' or non-numeric string
	}

/*
	function hGet(str: string, name: string): string {
		let pos = hFind(str, name);
		if (pos < 0) return '';
		let end = str.indexOf(str.slice(-1), ++pos);
		const raw = end >= 0 ? str.slice(pos, end) : str.slice(pos); // 'name:value' or bare 'name'
		const colon = raw.indexOf(':');
		return colon >= 0 ? raw.slice(colon + 1) : '';   // value only, '' for bare name
	}
*/

	function hSet(str: string, name: string, value: string): string {
		const d = str.slice(-1);
		// value may itself be a sub-list — stored as-is, delimiter self-describes it
		const entry = name + (value ? ':' + value : '');
		let pos = str.indexOf(d + name + ':');
		if (pos < 0) pos = str.indexOf(d + name + d);
		if (pos < 0) return str + entry + d;           // append new entry
		let end = str.indexOf(d, pos + 1);
		return str.slice(0, pos + 1) + entry + (end >= 0 ? str.slice(end) : '');
	}

	function hDel(str: string, name: string): string {
		const d = str.slice(-1);
		let pos = str.indexOf(d + name + ':');
		if (pos < 0) pos = str.indexOf(d + name + d);
		if (pos < 0) return str;
		let end = str.indexOf(d, pos + 1);
		return str.slice(0, pos) + (end >= 0 ? str.slice(end) : '');
	}

	function hGetSub(str: string, ...names: string[]): string {
		// drill down through arbitrary levels: hGetSub(zstr, 'TileName', 'style', 'color')
		let current = str;
		for (const name of names) {
			current = hGet(current, name);
			if (!current) return '';
		}
		return current;
	}

	function hSetSub(str: string, value: string, ...names: string[]): string {
		// set a value at arbitrary depth, rebuilding each level upward
		if (names.length === 1) return hSet(str, names[0], value);
		const [head, ...tail] = names;
		let sub = hGet(str, head);
		sub = hSetSub(sub, value, ...tail);
		return hSet(str, head, sub);
	}

	// ─── Internal helpers ────────────────────────────────────────────────────────

	function hIsDelim(ch: string): boolean {
		return ch.length === 1 && DelimList.includes(ch);
	}

	// ─── Public functions ────────────────────────────────────────────────────────

	/**
	 * Returns a string containing each delimiter found in hstr,
	 * in ascending DelimList order (| first, \x15 last).
	 */
	function hDelimsAll(hstr: string): string {
		let result = '';
		for (const ch of DelimList) {
			if (hstr.includes(ch)) result += ch;
		}
		return result;
	}

	/**
	 * Returns the highest-indexed delimiter (in DelimList order) present in hstr.
	 * Returns '' if hstr contains no delimiter.
	 */
	function hMaxDelim(hstr: string): string {
		let maxDelim = '';
		for (const ch of DelimList) {
			if (hstr.includes(ch)) maxDelim = ch;
		}
		return maxDelim;
	}

	/**
	 * Splits hstr by its primary (max) delimiter, returning an array of raw
	 * elements — each in name:Value form, still containing their lesser delimiters.
	 * Trailing empty element from a terminated hstr is filtered out.
	 */
	function hRaw(hstr: string): string[] {
		const delim = hMaxDelim(hstr);
		if (!delim) return hstr.length > 0 ? [hstr] : [];
		return hstr.split(delim).filter(s => s.length > 0);
	}

	/**
	 * Hard-adds Type:newstr as a new element in hstr.
	 * Does NOT search for or replace any existing element of the same Type.
	 * Uses hMaxDelim(hstr) as the separator; if hstr is empty, infers the
	 * correct primary delimiter as one level above newstr's max delimiter.
	 */
	function hAddType(hstr: string, newstr: string, Type: string): string {
		let delim = hMaxDelim(hstr);
		if (!delim) {
			// hstr has no delimiter yet — infer one level above newstr's max
			const innerMax = hMaxDelim(newstr);
			const nextIdx  = innerMax
				? DelimList.indexOf(innerMax) + 1
				: 1;                                    // default: \t (index 1)
			delim = nextIdx < DelimList.length
				? DelimList[nextIdx]
				: DelimList[DelimList.length - 1];
		}
		const entry = `${Type}:${newstr}`;
		// Normalise hstr to end with its primary delimiter before appending
		const base  = hstr.endsWith(delim) ? hstr
					: hstr.length > 0      ? hstr + delim
					: '';
		return base + entry + delim;
	}

	/**
	 * Validates or creates a well-formed hstr.
	 *
	 * Overload A — string[]  (vType absent or ''):
	 *   Joins each element with \n; ensures the result is \n-terminated.
	 *   Each element may already contain | and \t sub-structure.
	 *
	 * Overload B — string, vType = '':
	 *   Returns hstr terminated by its own hMaxDelim (adds it if missing).
	 *
	 * Overload C — string, vType = single valid delimiter:
	 *   Returns hstr terminated by vType (adds it if missing).
	 *
	 * Overload D — string, vType = anything NOT in DelimList:
	 *   Returns a diagnostic qList report:
	 *     hList:Report|Delims:<escaped, excluding |>|maxDelim:<escaped>|
	 *   If the hstr cannot be self-corrected by hValid(hstr), appends:
	 *     Error:<reason>|
	 */
	function hValid(hstr: string | string[], vType: string = ''): string {

		// ── Overload A: string[] ─────────────────────────────────────────────────
		if (Array.isArray(hstr)) {
			const joined = hstr.join('\n');
			return joined.endsWith('\n') ? joined : joined + '\n';
		}

		// ── Overload D: vType present but not a valid delimiter ──────────────────
		if (vType !== '' && !hIsDelim(vType)) {
			const delims         = hDelimsAll(hstr);
			const maxD           = hMaxDelim(hstr);
			// Spell out delims, excluding | (would break the qList report)
			const delimsSpelled  = [...delims]
				.filter(c => c !== '|')
				.map(hSpellDelim)
				.join('');
			const maxDelimSpelled = maxD ? hSpellDelim(maxD) : 'none';
			const canFix          = maxD !== '';  // fixable iff a delimiter exists

			let report = `hList:Report|Delims:${delimsSpelled}|maxDelim:${maxDelimSpelled}`;
			if (!canFix) {
				report += '|Error:No delimiter found — hstr cannot be auto-corrected';
			}
			report += '|';
			return report;
		}

		// ── Overload C: vType is a valid delimiter ───────────────────────────────
		if (vType !== '' && hIsDelim(vType)) {
			return hstr.endsWith(vType) ? hstr : hstr + vType;
		}

		// ── Overload B: vType is '' — terminate with hMaxDelim ───────────────────
		const maxD = hMaxDelim(hstr);
		if (!maxD) return hstr;                 // no delimiter — nothing to do
		return hstr.endsWith(maxD) ? hstr : hstr + maxD;
	}

	// ── hSort: sort elements by name (replaces zqRawByNames pattern) ─────────────
	function hSort(hstr: string): string {
		const d = hstr.slice(-1);
		const elems = hRaw(hstr);
		elems.sort();
		return d + elems.join(d) + d;
	}

	// ── hSortByDesc: sort by value (replaces zqRawByDesc pattern) ────────────────
	function hSortByDesc(hstr: string): string {
		const d = hstr.slice(-1);
		const elems = hRaw(hstr);
		elems.sort((a, b) => {
			const ac = a.indexOf(':'), bc = b.indexOf(':');
			const ad = ac >= 0 ? a.slice(ac + 1) : a;
			const bd = bc >= 0 ? b.slice(bc + 1) : b;
			return ad < bd ? -1 : ad > bd ? 1 : 0;
		});
		return d + elems.join(d) + d;
	}

	// ── hBubble: swap element with neighbor (replaces zqBubble) ─────────────────
	// dir=0: bubble down (toward end); dir=1: bubble up (toward start)
	// Returns new hstr on success, false if already at boundary
	function hBubble(hstr: string, name: string, dir = 0): string | false {
		const d    = hstr.slice(-1);
		const pos  = hFind(hstr, name);       // position of leading delimiter
		if (pos < 0) return false;
		const end  = hstr.indexOf(d, pos + 1);
		if (end < 0) return false;

		if (dir === 0) {
			// Bubble down — swap with next element
			const nextEnd = hstr.indexOf(d, end + 1);
			if (nextEnd < 0) return false;    // already last element
			const elem = hstr.slice(pos + 1, end);      // 'name:val'
			const next = hstr.slice(end + 1, nextEnd);  // 'nextName:val'
			return hstr.slice(0, pos + 1) + next + d + elem + hstr.slice(nextEnd);
		} else {
			// Bubble up — swap with previous element
			if (pos === 0) return false;      // already first element
			const prevPos = hstr.lastIndexOf(d, pos - 1);
			if (prevPos < 0) return false;
			const prev = hstr.slice(prevPos + 1, pos);  // 'prevName:val'
			const elem = hstr.slice(pos + 1, end);      // 'name:val'
			return hstr.slice(0, prevPos + 1) + elem + d + prev + hstr.slice(end);
		}
	}

	// ── hMerge: merge add into hstr (replaces zqMerge) ──────────────────────────
	// overlay=true (default): incoming values replace existing ones
	// overlay=false: existing values are preserved, only new names are added
	function hMerge(hstr: string, add: string, overlay = true): string {
		const addElems = hRaw(add);

		// Fast path: no name overlaps — just append all incoming elements
		const noOverlap = addElems.every(elem => {
			const colon = elem.indexOf(':');
			const name  = colon >= 0 ? elem.slice(0, colon) : elem;
			return hFind(hstr, name) < 0;
		});
		if (noOverlap) {
			const d    = hstr.slice(-1);
			const base = hstr.endsWith(d) ? hstr : hstr + d;
			return base + addElems.join(d) + d;
		}

		// Slow path: merge entry by entry
		let result = hstr;
		for (const elem of addElems) {
			const colon = elem.indexOf(':');
			const name  = colon >= 0 ? elem.slice(0, colon) : elem;
			const value = colon >= 0 ? elem.slice(colon + 1) : '';
			if (overlay || hFind(result, name) < 0)
				result = hSet(result, name, value);
		}
		return result;
	}

	// ── hSplitNames: parallel name/raw arrays (replaces zqSplitNames) ───────────
	function hSplitNames(hstr: string): strsPair {
		const raw   = hRaw(hstr);
		const names = raw.map(s => { const c = s.indexOf(':'); return c >= 0 ? s.slice(0, c) : s; });
		return new strsPair(names, raw);
	}

	// ── hNames: just the name array (replaces zqNames) ──────────────────────────
	function hNames(hstr: string): string[] {
		return hSplitNames(hstr).a;
	}

	// ── hFromRaw: rebuild hstr body from raw elements (replaces zqFromRaw) ───────
	// Preserves the list name/desc header before the first delimiter
	function hFromRaw(hstr: string, rawElems: string[]): string {
		const d      = hstr.slice(-1);
		const firstD = hstr.indexOf(d);
		const header = firstD >= 0 ? hstr.slice(0, firstD + 1) : d;
		const body   = rawElems.join(d);
		return header + (body ? body + d : '');
	}
	// These keep their existing logic exactly — just renamed for naming consistency

	function hGetVID(hstr: string, name: string | number): vID | undefined {
		const nPos = hFind(hstr, name.toString());
		if (nPos < 0) return undefined;
		const d   = hstr.slice(-1);
		const end = hstr.indexOf(d, nPos + 1);
		return end >= 0 ? new vID(hstr.slice(nPos + 1, end)) : undefined;
	}

	function hGetVIDFmt(hstr: string, name: string | number): vID | undefined {
		const VID = hGetVID(hstr, name);
		if (VID && !VID.Fmt) VID.Fmt = new IFmt();
		return VID;
	}

	function hSetVID(hstr: string, VID: vID): string {
		const str = VID.to$;
		if (!str) return hstr;
		const pos = str.indexOf(':');
		return pos >= 0
			? hSet(hstr, str.slice(0, pos), str.slice(pos + 1))
			: hSet(hstr, str, '');
	}

	function hToVIDs(hstr: string): vID[] {
		return hRaw(hstr).map(s => new vID(s));
	}

	function hToSortedVIDs(hstr: string): vID[] {
		return hSortByDesc(hstr)  // reuse hSortByDesc, then convert
			.split(hstr.slice(-1)).slice(1, -1).map(s => new vID(s));
	}

	function hToVIDList(hstr: string, sep = ' ', delim = ':'): string {
		return hToVIDs(hstr)
			.map(v => v.Name + delim + v.Desc)
			.join(sep);
	}

} // namespace RS1





















/*
	//	new qList functions (freestanding)


	// ── Helpers ──────────────────────────────────────────────────────────────────

	export function zqFindName(qstr: string, name: string|number): number {
		let str = '|' + name.toString() + ':';
		let nPos = qstr.indexOf(str);
		if (++nPos > 0) return nPos;
		str = str.slice(0,-1) + '|';
		nPos = qstr.indexOf(str);
		return nPos >= 0 ? nPos + 1 : -1;
	}

	export function zqPrePost(qstr: string, name: string|number): strPair {
		let nPos = zqFindName(qstr, name);
		if (nPos >= 0) {
			let dPos = qstr.indexOf('|', nPos);
			if (dPos >= 0)
				return new strPair(qstr.slice(0, nPos), qstr.slice(dPos));
		}
		return new strPair('', '');
	}

	// ── Read-only ─────────────────────────────────────────────────────────────────

	export function zqDescByName(qstr: string, name: string|number): string {
		let nPos = zqFindName(qstr, name);
		if (nPos < 0) return '';
		let endPos = qstr.indexOf('|', nPos);
		if (endPos < 0) return '';
		let str = qstr.slice(nPos, endPos);
		let dPos = str.indexOf(':');
		return (dPos >= 0) ? str.slice(dPos + 1) : str;
	}

	export function zqGetStrNull(qstr: string, s: string): string|undefined {
		let pos = zqFindName(qstr, s);
		if (pos < 0) return undefined;
		let endpos = qstr.indexOf('|', pos);
		if (endpos < 0) return undefined;
		let str = qstr.slice(pos, endpos), colon = str.indexOf(':');
		return (colon >= 0) ? str.slice(colon + 1) : str;
	}

	export function zqCount(qstr: string): number {
		let i = qstr.length, count = 0;
		while (--i >= 0)
			if (qstr[i] === '|') ++count;
		return (count <= 1) ? 0 : count - 1;
	}

	export function zqNum(qstr: string, name: string|number): number {
		return Number(zqDescByName(qstr, name));
	}

	export function zqToRaw(qstr: string): string[] {
		return qstr.split('|').slice(1, -1);
	}

	export function zqSplitNames(qstr: string): strsPair {
		let raw = zqToRaw(qstr), names = new Array(raw.length), count = 0;
		for (const s of raw) {
			let dPos = s.indexOf(':');
			names[count++] = (dPos >= 0) ? s.slice(0, dPos) : s;
		}
		return new strsPair(names, raw);
	}

	export function zqNames(qstr: string): string[] {
		return zqSplitNames(qstr).a;
	}

	export function zqFindByDesc(qstr: string, Desc: string|number): number {
		let SearchStr = ':' + Desc.toString() + '|';
		let Pos = qstr.indexOf(SearchStr, qstr.indexOf('|'));
		if (Pos >= 0) {
			for (let i = Pos; --i > 0;)
				if (qstr[i] === '|') return i + 1;
		}
		SearchStr = '|' + Desc.toString() + '|';
		return qstr.indexOf(SearchStr);
	}

	export function zqNameByDesc(qstr: string, desc: string|number): string {
		let Pos = zqFindByDesc(qstr, desc);
		return (Pos >= 0) ? qstr.slice(Pos, qstr.indexOf(':', Pos)) : '';
	}

	export function zqGetVID(qstr: string, name: string|number): vID|undefined {
		let nPos = zqFindName(qstr, name);
		if (nPos < 0) return undefined;
		let endPos = qstr.indexOf('|', nPos);
		return (endPos >= 0) ? new vID(qstr.slice(nPos, endPos)) : undefined;
	}

	export function zqGetVIDFmt(qstr: string, name: string|number): vID|undefined {
		let VID = zqGetVID(qstr, name);
		if (VID && !VID.Fmt) VID.Fmt = new IFmt('');
		return VID;
	}

	export function zqToVIDs(qstr: string): vID[] {
		return zqToRaw(qstr).map(s => new vID(s));
	}

	export function zqRawByNames(qstr: string): string[] {
		return qstr.split('|').slice(1, -1).sort();
	}

	export function zqRawByDesc(qstr: string): string[] {
		let Strs = qstr.split('|').slice(1, -1);
		Strs = Strs.map(S => {
			let Pos = S.indexOf(':');
			let desc = (Pos >= 0) ? (S.slice(Pos + 1) || S.slice(0, Pos)) : S;
			return desc + '\t' + S;
		});
		Strs.sort();
		return Strs.map(S => S.slice(S.indexOf('\t') + 1));
	}

	export function zqToSortedVIDs(qstr: string): vID[] {
		return zqRawByDesc(qstr).map(s => new vID(s));
	}

	export function zqToVIDList(qstr: string, Sep = ';', Delim = ':'): string {
		let Str = '';
		for (const v of zqToVIDs(qstr))
			Str += v.Name + Delim + v.Desc + Sep;
		return Str.slice(0, -1);
	}

	// ── Mutating (return new qstr) ────────────────────────────────────────────────

	export function zqSet(qstr: string, name: string|number, desc: string|number = ''): string {
		let vStr = desc ? (name.toString() + ':' + desc.toString()) : name.toString();
		let pair = zqPrePost(qstr, name);
		return pair.a ? (pair.a + vStr + pair.b) : (qstr + vStr + '|');
	}

	export function zqDel(qstr: string, name: string|number): string {
		let pair = zqPrePost(qstr, name);
		return pair.a ? (pair.a + pair.b) : qstr;
	}

	export function zqSetVID(qstr: string, VID: vID): string {
		let str = VID.to$;
		if (!str) return qstr;
		let pos = str.indexOf(':');
		return (pos < 0) ? zqSet(qstr, str) : zqSet(qstr, str.slice(0, pos), str.slice(pos + 1));
	}

	export function zqSetFastValues(qstr: string, ValueStr = ''): string {
		let firstDelim = qstr.indexOf('|');
		if (firstDelim < 0) return qstr;                    // not a legal qstr
		if (ValueStr.slice(-1) !== '|') ValueStr += '|';
		if (ValueStr[0]  !== '|') ValueStr = '|' + ValueStr;
		return qstr.slice(0, firstDelim) + ValueStr;
	}

	export function zqSetNameValues(qstr: string, nv: (string|number|undefined)[] = []): string {
		let i = 0, name = 0, NVs: string[] = Array((nv.length + 1) >> 1);
		for (const v of nv) {
			if (++name & 1) NVs[i]  = v ? v.toString() : '';
			else { if (v) NVs[i++] += ':' + v.toString(); else ++i; }
		}
		NVs.length = NVs[i] ? i + 1 : i;
		let newValStr  = '|' + NVs.join('|') + '|';
		let firstDelim = qstr.indexOf('|');
		return (firstDelim >= 0) ? qstr.slice(0, firstDelim) + newValStr : newValStr;
	}

	export function zqFromRaw(qstr: string, VIDStrs: string[] = []): string {
		let NameDesc = qstr.slice(0, qstr.indexOf('|') + 1);
		let VIDStr   = VIDStrs.join('|');
		return NameDesc + (VIDStr ? (VIDStr + '|') : '');
	}

	export function zqMerge(qstr: string, add1: qList|string, overlay = false): string {
		let addStr  = (typeof add1 === 'string') ? add1 as string : (add1 as qList).to$;
		let addSplit = zqSplitNames(addStr);
		// fast path: no name overlap
		let notFound = true;
		for (const a of addSplit.a)
			if (zqFindName(qstr, a) >= 0) { notFound = false; break; }
		if (notFound) {
			let s = addStr.slice(addStr.indexOf('|'));
			return qstr + s.slice(s.indexOf('|'));
		}
		// slow path: entry-by-entry merge
		let dest = zqSplitNames(qstr);
		for (let lim = addSplit.a.length, i = 0; i < lim; ++i) {
			let j = dest.a.indexOf(addSplit.a[i]);
			if (j >= 0) dest.b[j] = addSplit.b[i];
			else { dest.a.push(addSplit.a[i]); dest.b.push(addSplit.b[i]); }
		}
		return zqFromRaw(qstr, dest.b);
	}

	export function zqSetFast(qstr: string, Args: any[]): string {
		if (Args.length & 1) throw 'zqSetFast requires Name:Value pairs';
		let str = '|';
		for (let i = 0; i < Args.length; i += 2)
			str += Args[i].toString() + ':' + Args[i+1].toString() + '|';
		return zqMerge(qstr, str);
	}

	export function zqBubble(qstr: string, name: string|number, dir = 0): string|false {
		let start = zqFindName(qstr, name);
		if (start < 0) return false;
		let end = qstr.indexOf('|', start + 1);
		if (end < 0) return false;
		if (dir > 0) {
			end = qstr.indexOf('|', end + 1);
			if (end < 0) return false;
		} else {
			let i = start - 1;
			while (--i >= 0)
				if (qstr[i] === '|') { start = i + 1; break; }
			if (i < 0) return false;
		}
		let flipstr = qstr.slice(start, end);
		let dPos = flipstr.indexOf('|');
		if (dPos < 0) return false;
		flipstr = flipstr.slice(dPos + 1) + '|' + flipstr.slice(0, dPos);
		return qstr.slice(0, start) + flipstr + qstr.slice(end);
	}
*/










import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// import { URLTranscoder } from '$lib/DBKit/Transcoder';
// import Blobs from '$lib/Blobs/index';
// import buffer from "node:buffer";
import { RS1 } from '$lib/RS';

import db from 'better-sqlite3';
import type { Statement } from 'sqlite';
import bsqlite from 'better-sqlite3';

class DBKit {
	private _db: typeof db.prototype;

	constructor(dbPath: string) {
		this._db = new db(dbPath);
		console.log ('Database opened at ' + dbPath + '\nDB=' + this._db.name);
		console.log ('Database:' + this._db + ' MEM ' + this._db.memory);
		RS1.myServer = 'S';

		RS1.ReqAB = ReqAB;
		RS1.ReqPack = ReqPack;
		RS1.ReqRSD = ReqRSD;
		RS1._RegRID = 'S';

		let rsd = new RS1.RSD ('|?QSQL:UPDATE|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		this.newBuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:DELETE|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		this.newBuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:INSERT|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		this.newBuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:SELECT|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		this.newBuildQ (rsd);
	}

	get db() {
		return this._db;
	}

	get name() {
		return this._db.name;
	}

	public close() {
		this._db.close();
	}

	newBuildQ (rsd : RS1.RSD) : any[] {
		let Raw = rsd.qToRaw;
		let table = 'S', tile = 0, ID = 0;		// default Table Name (if not specified)
		let qType = '!BadQType', Type = '', SQLCmd, Wheres:string[]=[];
		let qStr = '', vStr = '', Name, Values : any[] =[];

		for (const r of Raw) {
			let colon = r.indexOf (':'), vName, first, vDesc, str;
			if (colon >= 0) {
				vName = r.slice (0,colon);
				vDesc = r.slice (colon+1);
			}
			else { vName = r; vDesc = ''; }

			console.log (' :::RAW line=' + r + ', newBuildQ, vName=' + vName + ', vDesc=' + vDesc);
			if ((first = vName[0]) < 'A') {		// not a legal field name, must be control
				if (first === '?') {
					switch (vName[1]) {
						case '?' : Wheres.push (vDesc);	break;
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

						case '#' :	tile = Number (vDesc);	break;	// tileID

						case 'R' :	table = vDesc; break;	// Row (Record) Type == Table

						case 'I' :	ID = Number (vDesc);	Wheres.push ('ID = ' + vDesc); break;	// recordID (unique for this table)
					}
				}
			}
			else {	// legal name:value pair
				if (qType === 'I') {
					qStr += vName + ',';
					vStr += '?,';
				}
				else {
					qStr += vName + '=?,';
				}
				Values.push (vDesc);
				console.log ('  adding ' + vName + ', Value =' + vDesc);
			}
		}


		vStr = vStr.slice (0,-1); qStr = qStr.slice (0,-1);

		console.log ('table=' + table + ' ID=' + ID.toString () + ' tile=' + tile.toString () +
					' qType=' + qType + '  qStr=' + qStr + ' vStr=' + vStr);
		for (var w of Wheres) 
			console.log ('  where= ' + (w = '(' + w + ')') );


		switch (qType) {
			case	'I'	:
				qStr = 'INSERT INTO ' + table + ' (' + qStr + 
						') VALUES (' + vStr + ')';
				break;

			case	'U' :
				qStr = 'UPDATE ' + table + ' SET ' + qStr + ' WHERE ';
				qStr += Wheres.join (' AND ') + ';';
				break;

			case	'D'	:
				qStr = 'DELETE FROM ' + table + ' WHERE ID = ' + ID.toString () + ';';
				break;

			case	'S'	:
				qStr = 'SELECT * FROM ' + table;
				if (Wheres.length)
					qStr += ' WHERE ' + Wheres.join (' AND ') + ';';
				else qStr += ';';
				break;

			default :
				qStr = 'Error:&&qType=' + qType + '&&' + SQLCmd + table + ' SET (' + qStr + ') VALUES (' + vStr + ') WHERE ID=' + ID.toString () + ';';
				break;
		}
		console.log ('I/U qStr =' + qStr + ' ... vStr =' + vStr );

		console.log ('buildQ nValues = ' + Values.length.toString ());
		console.log ('qStr=' + qStr + '  ... vStr =' + vStr);

		rsd.T = qStr;

		return Values;
	}

	newExecQ (rsd : RS1.RSD, Params : any[]) : RS1.RSD {
		let query = rsd.T as string;
		console.log ('ExecQ QUERY=' + rsd.T + '.');
		const statement = this._db.prepare (rsd.T as string) as unknown as Statement;

		let dbResponse;

		if (query[0] !== 'S')
		{
			let reply = new RS1.RSD ();

			dbResponse = statement.run (Params);
			reply.objectIn (dbResponse);

			console.log (dbResponse);
			return reply;
		}

		dbResponse = statement.all (Params); // run  for update/?delete // (Params);
		let ObjArray = dbResponse as unknown as object[], Mom = new RS1.RSD (rsd.qGetQStr);
		Mom.K = new RS1.RSK (Mom);	// let them have kids! 

		for (const each of ObjArray) {
			let reply = new RS1.RSD ();

			reply.objectIn (each as Object);
			Mom.kidAdd (reply);
		}

		return Mom;
	}

}

// const DBK = new DBKit('tile.sqlite3');

class RServer {
	DBK : DBKit;
	myVilla='S';
	myTile='';
	myServerName='ABC';

	nextSession=0;

	constructor (Path : string) {
		this.DBK = new DBKit (Path);

		RS1.myVilla = '!Error';
		RS1.myServer = '!Error';
		RS1.myTile = '!Error';
	}

}

const Q = new DBKit ('q.sqlite3');

const RSS = new RServer ('tile.sqlite3');

async function ReqRSD (InRSD : RS1.RSD) : Promise<RS1.RSD> {
	let cmd = new RS1.RSDCmd (InRSD), initStr = '?|';	// default is confused reply

	console.log ('ReqRSD, InRSD=' + InRSD.to$ + ', cmd.SessionID=' + cmd.SessionID.toString () + ', cmd.command=' + cmd.command);
	// Real processing here 
	if (cmd.SessionID) {
		switch (cmd.command[1]) {		// command[0]  is ? | .   (server vs. client)
			case 'B' : console.log ('User logs out.');
				initStr = 'Bye:Thanks for playing.';
				break;

			case 'Q' :
				console.log ('Calling newBuildQ'); 
				let Params = RSS.DBK.newBuildQ (InRSD);
				console.log ('Calling newExecQ');
				let outRSD = RSS.DBK.newExecQ (InRSD, Params);
				return outRSD;
		}

	}
	else {	// first 
		cmd.SessionStr = (cmd.SessionID = ++RSS.nextSession).toString ();
		cmd.NumberStr = '1:' + cmd.SessionStr;
		initStr = 'Hi:'+ cmd.SessionStr + ':' + RSS.myServerName;
	}



	let Numbers = '#:'+cmd.SerialIDStr+':'+cmd.SessionStr,
		OutRSD = new RS1.RSD ('|.:' + initStr + '|#:' + cmd.NumberStr + '|');

	return OutRSD;
}





























async function ReqAB (AB : ArrayBuffer) : Promise<ArrayBuffer> {
	console.log ('Entering ReqAB in Server.ts, AB Bytes = ' + AB.byteLength.toString ());
	let str = RS1.ab2str (AB);
	console.log ('AB = ' + str);
	let Buf = RS1.newBuf (AB);

	let rsd = RS1.newRSD (Buf);
	// rsd.constructRSD (RS1.newBuf (AB));

	console.log ('Calling ReqRSD in ReqAB/server.ts, rsd= ' + rsd.to$ + '\n' + rsd.expand)
	let ResultRSD = await RS1.ReqRSD (rsd);

	console.log ('Returned from ReqRSD with ResultRSD/server.ts, ResultRSD=' + ResultRSD.to$);

	let ResultAB = RS1.bb2ab (ResultRSD.toBBI);
	return ResultAB;
}

export const POST = (async ({ request, url }) => {

	const ClientAB = await request.arrayBuffer();

	console.log ('ClientAB received in POST/server.ts, Bytes = ' + 
		ClientAB.byteLength.toString () + ' str=' + RS1.ab2str (ClientAB));

	let ServerAB = await RS1.ReqAB (ClientAB);

	return new Response(ServerAB);
}) satisfies RequestHandler;




async function ReqPack (InPack : RS1.BufPack) : Promise<RS1.BufPack> {
	let Serial = InPack.fNum ('#');
	let Client = InPack.fStr ('Client');
	let ABC = InPack.fStr ('ABC');
	let OutPack : RS1.BufPack;

	if (!Serial)
	{
		console.log ('ReqPack NO Client Serial:\n' + InPack.expand);
		throw "ReqPack No Client Serial!";
	}
	console.log ('Server Receives Client Request #' + Serial.toString (),
		 ' Client = ' + Client + ' ABC=' + ABC);

	OutPack = new RS1.BufPack ();

	return OutPack;

/*

	let QF = InPack.xField;
	if (!QF)
		return RS1.NILPack;

	console.log ('-----------\nInPack=' + InPack.info + 'Q=' + QF?.Str + '\n-----------\n'
		 + InPack.desc);

		 
	switch (QF.Name) {
		case '!Q' :
			RSS.myTile = InPack.fStr('.T');
			console.log ('  Query Tile --> ' + RSS.myTile);
			
			let Params = RSS.DBK.buildQ (InPack);
			OutPack = RSS.DBK.execQ (InPack, Params);

			OutPack.addArgs (['#',Serial]);

			console.log ('Server Sends Result #' + Serial.toString () + ' BP:\n' + OutPack.desc);
			return OutPack;

		case '!H' :
			OutPack = new RS1.BufPack ();
			OutPack.addArgs (['!H',++(RSS.nextSession),'#',Serial]);
			console.log ('  Starting Session #' + RSS.mySession);
			return OutPack;
			break;

		default : return RS1.NILPack;
	}
*/

	return RS1.NILPack;
}

/*
	public execQ (Pack : RS1.BufPack, Params : any[]) : RS1.BufPack {
		let Query = Pack.fStr ('!Q');
		console.log ('ExecQ QUERY=' + Query + '.');
		// Query = "SELECT name FROM sqlite_master";	// retrieve all tables
		const statement = this._db.prepare (Query) as unknown as Statement;

		let dbResponse;
		if (Query[0].toUpperCase () === 'S') {
			dbResponse = statement.all (Params); // run  for update/?delete // (Params);
			let RecArray = dbResponse as unknown as object[];
			console.log ("RecArray: length = " + RecArray.length.toString () + '\n' + RecArray);
			console.log (RecArray);

			let RIDSuffix = '_' + RSS.myTile + ',' + RSS.myVilla;
			RS1.log ('----- RIDSuffix='+ RIDSuffix, ' tile = ' + RSS.myTile + ' villa = ' + RSS.myVilla);

			let RID = new RS1.RID (RIDSuffix);

			let BPs = Array (RecArray.length);
			let countBP = 0;
			console.log ('Server receives Record Array from Query, length = ' + RecArray.length.toString ());
			for (let Each of RecArray) {
				let Obj = Each as object;
				let BP = new RS1.BufPack ();
				BP.objectIn (Obj);
				RID.ID = BP.fNum('id');
				BP.addArgs (['.rid', RID.to$]);

				console.log ('   Adding RID ' + RID.to$ + '\n' + BP.expand);

				let BPCopy = new RS1.BufPack ();
				BPCopy.bufIn (BP.bufOut ());
				console.log ('   BPCopy =' + BPCopy.expand);

				BPs[countBP++] = BP;
				}
				// Pack.Cs = [];
				Pack.packArray (BPs);
				console.log ('Server packs ' + BPs.length.toString () + ' records to send to client');
				console.log (Pack.expand);
				let newBPs = new RS1.BufPack ();
				newBPs.bufIn (Pack.bufOut ());
			}
		else {
			// console.log ('Dumping dbResponse after run');
			dbResponse = statement.run (Params);
			Pack.objectIn (dbResponse);

			console.log (dbResponse);
		}


		return Pack;

		// return dbResponse;
	}
*/



/*
	buildQ (QBuf : RS1.BufPack) : any[] {
		// select, insert, update, delete
		console.log ('SQL buildQ QBuf=\n' + QBuf.desc);

		let Tile, qType = '', ID;
		let QF = QBuf.xField;
		if (QF)
			qType = QF.Str;

		let Cs = QBuf.Cs;

		for (const C of Cs) {
			switch (C.Name.toUpperCase ()) {
				case '.I' : case '.ID' : ID = C.Num; break;
				case '.T' : case '.TILE' : case '.TABLE' : Tile = C.Str; break;
			}
		}

		if (!QF) {
			QBuf.addArgs (['!E','No Query!']);
			return [];
		}

		let qStr = '', vStr = '', Name;
		let Ds = QBuf.Ds;
		let Values = new Array (Ds.length);	// long enough
		let nValues = 0;

		for (const F of Ds)
		{
			Name = F.Name;
			if (qType === 'I') {
				qStr += Name + ',';
				vStr += '?,';
			}
			else {
				qStr += Name + '=?,';
			}

			switch (F.Type) {
				case RS1.tNum : Values[nValues++] = F.Num; break;
				case RS1.tStr : Values[nValues++] = F.Str; break;
				default : Values[nValues++] = new Int8Array (F.toAB1);
			}								
		}
		Values = Values.slice (0,nValues);

		console.log ('buildQ nValues = ' + nValues.toString ());
		console.log ('qStr=' + qStr + '. vStr =' + vStr);

		switch (qType) {
			case 'S' : case 'D' :
				if (qType[0] === 'S')
					qStr = 'SELECT * FROM ' + Tile;
				else qStr = 'DELETE FROM ' + Tile;
				if (ID)
					qStr += ' WHERE id=' + ID.toString () + ';';
				else qStr += ';';
				break;

			case 'H' :	case 'G' : // Hello, Goodbye from client
				qStr = '';	// fall out with no SQL, server handles
				break;

			case 'I' : case 'U' :
				console.log ('Entering IU');
				if (qType === 'I') {
					qStr = 'INSERT INTO ' + Tile + ' (';
					vStr = ') VALUES(';		
					}
				else {
					qStr = 'UPDATE ' + Tile + ' SET '; vStr = '';
				}

				for (const F of Ds)
				{
					Name = F.Name;
					if (qType === 'I') {
						qStr += Name + ',';
						vStr += '?,';
					}
					else {
						qStr += Name + '=?,';
					}
				}

				if (qType === 'I') {
					qStr = qStr.slice (0,qStr.length-1) + vStr.slice (0,vStr.length-1) + ');';
				}
				else {	// 'U'
					console.log ('  Entering U, ID = ' + ID?.toString ());
					if (ID && nValues) {
						qStr = qStr.slice (0,qStr.length - 1) + 
								' WHERE id=' + ID.toString () + ';';
					}
					else {
						QBuf.addArgs (['!E','ERROR:' + qType]);
						console.log ('  U ERROR!');
						return [];
					}
				}
				console.log ('I/U qStr =' + qStr + '. vStr =' + vStr + '.');
				break;

			default : 
				console.log ('Leaving QF AS IS, returning Values');
				return Values;	// leave QF.Str as IS, return Values
		}	// switch

		console.log ('buildQ, adding qStr = ' + qStr);
		QBuf.addArgs (['!Q',qStr]);

		console.log ('BuildQ = ' + qStr + ' ' + Values.length.toString () + ' Values');
		vStr = '    QueryVals=';
		for (let i = Values.length; --i >= 0;) {
			let ValStr;
			switch (typeof (Values[i])) {
				case 'number' : ValStr = (Values[i] as number).toString (); break;
				case 'string' : ValStr = (Values[i] as string); break;
				default : ValStr = 'AB Bytes=' + (Values[i] as ArrayBuffer).toString ();
			}

			vStr += ValStr + '  '
		}

		console.log ('VSTR=' + vStr + '=');
		console.log ('Resulting BuildQ:\n' + QBuf.desc);

		return	Values;
	}	// BuildQ
*/

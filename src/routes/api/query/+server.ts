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
		RS1._RegRID = 'S';
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
				BP.addArgs (['.rid', RID.toStr]);

				console.log ('   Adding RID ' + RID.toStr + '\n' + BP.expand);

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

}

// const DBK = new DBKit('tile.sqlite3');

class RServer {
	DBK : DBKit;
	myVilla='S';
	myTile='';
	mySession='';

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

async function ReqPack (InPack : RS1.BufPack) : Promise<RS1.BufPack> {
	let Serial = InPack.fNum ('#');
	let OutPack : RS1.BufPack;

	if (!Serial)
	{
		console.log ('NO Client Serial:\n' + InPack.expand);
		throw "No Client Serial!";
	}
	console.log ('Server Receives Client Request #' + Serial.toString ());

	let QF = InPack.xField;

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
	
	return RS1.NILPack;
}

async function ReqAB (AB : ArrayBuffer) : Promise<ArrayBuffer> {
	let BP = new RS1.BufPack ();
	BP.bufIn (AB);

	let ResultPack = await RS1.ReqPack (BP);
	let ResultAB = ResultPack.bufOut ();
	return ResultAB;
}

export const POST = (async ({ request, url }) => {

	const ClientAB = await request.arrayBuffer();

	let ServerAB = await RS1.ReqAB (ClientAB);

	return new Response(ServerAB);
}) satisfies RequestHandler;

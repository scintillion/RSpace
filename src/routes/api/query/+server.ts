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

		if (rsd.BLOB)	{		// need to push BLOB data
			switch (qType) {
				case 'I'	:
					qStr += 'BLOB,';
					vStr += '?,';
					Values.push (rsd.BLOB);
					break;
				
				case 'U'	:
					qStr += 'BLOB=?,';
					Values.push (rsd.BLOB);
					break;
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
				Values = [];	// no pushed values need, zero if present
				break;

			case	'S'	:
				qStr = 'SELECT * FROM ' + table;
				if (Wheres.length)
					qStr += ' WHERE ' + Wheres.join (' AND ') + ';';
				else qStr += ';';
				Values = [];	// no pushed values need, zero if present
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

		console.log ('SELECT query =' + rsd.T + ' yields records=' + ObjArray.length.toString());
		for (const each of ObjArray) {
			console.log ('  each = ' + each);
			let reply = new RS1.RSD ();

			reply.objectIn (each as Object);
			Mom.kidAdd (reply);
		}

		console.log ('\n\n\n\n\n\n\nMom RSD=' + Mom.expand);

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
				let bbi = outRSD.toBBI;
				outRSD.BLOB = bbi;
				console.log ('\n\n\n\n\n\n\n\n\nOutRSD.BLOB = ' + outRSD.BLOB?.byteLength.toString ());
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

	console.log ('Returned from ReqRSD.BLOB = ' + ResultRSD.BLOB?.byteLength.toString () + 
			' with ResultRSD/server.ts, ResultRSD=' + ResultRSD.to$);

	let ResultAB = RS1.bb2ab (ResultRSD.toBBI);
	console.log ('  ResultAB Bytes=' + ResultAB.byteLength.toString ());

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
/*
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
*/
	return new RS1.BufPack ();
}


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
		let qStr = '', vStr = '', Name, Values : any[] =[], Names : string[] = [];

		for (const r of Raw) {
			if (!r)
				continue;
			
			let vName, first, vDesc, str, colon, special = (r[0] === ':');
			if (special) {
				colon = r.indexOf (':',1);
				if (colon >= 0) {
					vName = r.slice (1,colon); vDesc = r.slice (colon+1);
				}
				else { vName = r.slice (1); vDesc = '';	}
			}
			else {
				colon = r.indexOf (':');
				if (colon >= 0) {
					vName = r.slice (0,colon);
					vDesc = r.slice (colon+1);					
				}
				else {	vName = r; vDesc = '';	}
			}

			if ((vName === 'ID') && (!vDesc  ||  vDesc==='0'))
				continue;

			console.log (' :::RAW line=' + r + ', newBuildQ, vName=' + vName + ', vDesc=' + vDesc);
			if (((first = vName[0]) < 'A') && (first !== ':'))	{	// not a legal field name, must be control
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
						default : console.log ('Ignoring this line');
					}
				}
				else if (first === ':') {
					let name = vName.slice (1);
					if (!name)
						console.log ('\n\n\n\n\n\n\n   NULL Name, r =' + r);

					if (qType === 'I') {
						qStr += name + ',';
						Names.push (name);
						vStr += '?,';
					}
					else {
						qStr += name + '=?,';
						Names.push (name + '=?');
					}
					Values.push (vDesc);
					console.log ('  adding :' + name + ', Value =' + vDesc);
				}
			}
			else {
				if (first === ':') {
					vName = vName.slice (1);
					console.log ('  :Special: detected ' + vName + ':' + vDesc);
				}
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
		let query = rsd.T as string, count = 0;
		console.log ('ExecQ QUERY=' + rsd.T + '.');
		const statement = this._db.prepare (rsd.T as string) as unknown as Statement;

		let dbResponse, reply = new RS1.RSD ();

		if (query[0] !== 'S')
		{
			dbResponse = statement.run (Params);
			reply.objectIn (dbResponse);

			console.log ('Non Select Query returns: ' + dbResponse);
			return reply;
		}

		dbResponse = statement.all (Params); // run  for update/?delete // (Params);
		let ObjArray = dbResponse as unknown as object[], nRecords = ObjArray.length,
			BLOBS : Uint8Array[] = [], nBytes = 0;

		console.log ('SELECT query =' + rsd.T + ' yields records=' + nRecords.toString());
		for (const each of ObjArray) {
			reply.objectIn (each as Object);

			if (reply.BLOB) {
				console.log ('  each nBytes= '  + reply.BLOB?.byteLength.toString () + each);
				BLOBS.push (reply.BLOB as Uint8Array);
				++count;
				nBytes += (reply.BLOB as Uint8Array).byteLength;
			}
		}

		if (count) {
			console.log ('NewBuf Bytes=' + nBytes.toString ());
			let newBuf = RS1.newBuf (nBytes), offset = 0;

			for (const b of BLOBS) {
				newBuf.set (b, offset);
				offset += b.byteLength;
			}
			reply.BLOB = newBuf;

			console.log ('RSD.newBuf (BLOB) nBytes =', reply.BLOB.byteLength.toString ());
		}
		else reply.BLOB = undefined;

		reply.qSet ('Count',nRecords);
		return reply;
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

	console.log ('ReqRSD, InRSD=' + InRSD.expand + '\n   cmd.SessionID=' + cmd.SessionID.toString () + ', cmd.command=' + cmd.command + '\n\n\n');
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
	console.log ('\n\n\nReqAB in Server.ts, AB Bytes = ' + AB.byteLength.toString ());
	let str = RS1.ab2str (AB);
	console.log ('AB = ' + str);
	let Buf = RS1.newBuf (AB);

	let rsd = RS1.newRSD (Buf);
	// rsd.constructRSD (RS1.newBuf (AB));

	console.log ('Calling ReqRSD in ReqAB/server.ts, rsd= ' + rsd.expand)
	let ResultRSD = await RS1.ReqRSD (rsd);

	console.log ('Returned from ReqRSD, ResultRSD =' + ResultRSD.expand);

	let ResultAB = RS1.bb2ab (ResultRSD.toBBI);
	console.log ('  leaving ReqAB, returning ResultAB Bytes=' + ResultAB.byteLength.toString ());

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
	return new RS1.BufPack ();
}


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
		RS1.BuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:DELETE|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		RS1.BuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:INSERT|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		RS1.BuildQ (rsd);
		rsd = new RS1.RSD ('|?QSQL:SELECT|?Type:SampleType|?Group:MyGroup|?#:123|?Row:S|?ID:789|ABC:DEF|XYZ:123|');
		RS1.BuildQ (rsd);
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

	newExecQ (rsd : RS1.RSD, Params : any[]) : RS1.RSD {
		let query = rsd.T as string, count = 0;
		console.log ('ExecQ QUERY=' + rsd.T + '.');
		const statement = this._db.prepare (rsd.T as string) as unknown as Statement;

		let dbResponse;

		if (query[0] !== 'S')
		{
			let reply = new RS1.RSD ();
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
			let reply = new RS1.RSD ();
			reply.objectIn (each as Object);

			if (reply.BLOB) {
				BLOBS.push (reply.BLOB as Uint8Array);
				++count;
				nBytes += (reply.BLOB as Uint8Array).byteLength;
			}
		}

		let outRSD = new RS1.RSD ();
		if (count) {
			let newBuf = RS1.newBuf (nBytes), offset = 0;

			for (const b of BLOBS) {
				newBuf.set (b, offset);
				offset += b.byteLength;
			}
			outRSD.BLOB = newBuf;
		}

		outRSD.qSet ('Count',nRecords);
		return outRSD;
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
				// console.log ('Calling newBuildQ'); 
				let Params = RS1.BuildQ (InRSD);
				// console.log ('Calling newExecQ');
				let outRSD = RSS.DBK.newExecQ (InRSD, Params);
				let bbi = outRSD.toBBI;
				outRSD.BLOB = bbi;
				// console.log ('\n\n\n\n\n\n\n\n\nOutRSD.BLOB = ' + outRSD.BLOB?.byteLength.toString ());
				return outRSD;
		}

	}
	else {	// first 
		cmd.SessionStr = (cmd.SessionID = ++RSS.nextSession).toString ();
		cmd.NumberStr = '1:' + cmd.SessionStr;
		initStr = 'Hi:'+ cmd.SessionStr + ':' + RSS.myServerName;
	}



	let OutRSD = new RS1.RSD ('|_' + initStr + '|_#:' + cmd.NumberStr + '|');

	return OutRSD;
}





























async function ReqAB (AB : ArrayBuffer) : Promise<ArrayBuffer> {
	console.log ('\n\n\nReqAB in Server.ts, AB Bytes = ' + AB.byteLength.toString ());
	let str = RS1.ab2str (AB);
//	console.log ('AB = ' + str);
	let Buf = RS1.newBuf (AB);

	let rsd = RS1.newRSD (Buf);
	console.log ('Incoming RSD,');
	let cmd1 = new RS1.RSDCmd (rsd,true);
	// rsd.constructRSD (RS1.newBuf (AB));

//	console.log ('Calling ReqRSD in ReqAB/server.ts, rsd= ' + rsd.expand)
	let ResultRSD = await RS1.ReqRSD (rsd);

	console.log ('Outgoing RSD,');
	let cmd2 = new RS1.RSDCmd (ResultRSD,true);
//	console.log ('Returned from ReqRSD, ResultRSD =' + ResultRSD.expand);

	let ResultAB = RS1.bb2ab (ResultRSD.toBBI);
//	console.log ('  leaving ReqAB, returning ResultAB Bytes=' + ResultAB.byteLength);

	return ResultAB;
}

export const POST = (async ({ request, url }) => {

	const ClientAB = await request.arrayBuffer();

	console.log ('ClientAB received in POST/server.ts, Bytes = ' + 
		ClientAB.byteLength + ' str=' + RS1.ab2str (ClientAB));

	let ServerAB = await RS1.ReqAB (ClientAB);

	return new Response(ServerAB);
}) satisfies RequestHandler;




async function ReqPack (InPack : RS1.BufPack) : Promise<RS1.BufPack> {
	return new RS1.BufPack ();
}


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


	public execQ (Pack : RS1.BufPack, Params : any[]) : RS1.BufPack {
		let Query = Pack.str ('!Q');
		console.log ('ExecQ QUERY=' + Query + '.');
		// Query = "SELECT name FROM sqlite_master";	// retrieve all tables
		const statement = this._db.prepare (Query) as unknown as Statement;

		let dbResponse;
		if (Query[0].toUpperCase () === 'S') {
			dbResponse = statement.all (Params); // run  for update/?delete // (Params);
			let RecArray = dbResponse as unknown as object[];
			console.log ("RecArray: length = " + RecArray.length.toString () + '\n' + RecArray);
			console.log (RecArray);
			
			let BPs = Array (RecArray.length);
			let countBP = 0;
			console.log ('Server receives Record Array from Query, length = ' + RecArray.length.toString ());
			for (let Each of RecArray) {
				let Obj = Each as object;
				let BP = new RS1.BufPack ();
				BP.objectIn (Obj);
				BPs[countBP++] = BP;
				}
				Pack.Cs = [];
				Pack.pack (BPs);
				console.log ('Server packs ' + BPs.length.toString () + ' records to send to client');
				console.log (Pack.desc);
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

const DBK = new DBKit('tile.sqlite3');

export class RServer {
	DBK : DBKit;

	constructor (Path : string) {
		this.DBK = new DBKit (Path);

	}

}

const RSS = new RServer ('tile.sqlite3');

async function ReqPack (InPack : RS1.BufPack) : Promise<RS1.BufPack> {
	let Serial = InPack.num ('#');
	if (!Serial)
		throw "No Client Serial!";
	console.log ('Server Receives Client Request #' + Serial.toString ());

	let Params = RS1.sql.buildQ (InPack);
	let OutPack = DBK.execQ (InPack, Params);

	OutPack.add (['#',Serial]);

	console.log ('Server Sends Result #' + Serial.toString () + ' BP:\n' + OutPack.desc);
	return OutPack;
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

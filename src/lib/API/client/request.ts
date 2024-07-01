import { RS1 } from '$lib/RS';

var Serial : number = 0;

async function ABRequest (AB : ArrayBuffer): Promise<ArrayBuffer> {
    
    // console.log ('AB sent by Client, bytes = ' + AB.byteLength.toString ());
    const req = await fetch(
        `/api/query`,
        {
            method: 'POST',
            body: AB,
            headers: {
                "Content-Type": "application/octet-stream",
            },
        }
    );

    const response = await req.arrayBuffer();

    return response;
}

async function packRequest (BP : RS1.BufPack) : Promise<RS1.BufPack>{
  // console.log ('PackRequest Incoming = \n' + BP.Desc ());
  BP.addArgs (['#',++Serial]);

  let AB = BP.bufOut ();
  console.log ('Sending Client Request #' + Serial.toString ());

  let recvAB = await RS1.ReqAB (AB);

  BP.bufIn (recvAB);

  console.log (' ---- Received Server reply #' + BP.fNum ('#').toString () + '\n' + BP.desc);

  return BP;
}

export async function InitClient () {
   RS1.InitReq (ABRequest,packRequest);

   let newVID = new RS1.vID ('Name:Desc');
   let newFmt = new RS1.IFmt ('');
   newVID.Fmt = newFmt;

   console.log ('Client NewVID = "' + newVID.ToStr () + '".');
   newVID.Fmt.setType ('#');

   newVID.Fmt.setValue ('123');
   console.log ('xClient NewVID = "' + newVID.ToStr () + '".');

   newVID = new RS1.vID ('Name:[R1,100=49]Desc');
    console.log ('qClient NewVID = "' + newVID.ToStr () + '".');

    newVID.Fmt = new RS1.IFmt ('');

    newVID.Fmt.setType('Range');
    newVID.Fmt.setXtra ('1,100');
    newVID.Fmt.setValue ('49');
    console.log ('zClient NewVID = "' + newVID.ToStr () + '".');
    console.log ('zClient Fmt = "' + newVID.Fmt.ToStr () + '"');
    console.log ('Fmt.TypeStr =' + newVID.Fmt.TypeStr);

    newVID.Fmt = RS1.IFmt.create ('Range','25,75','64');
    console.log ('aClient NewVID = "' + newVID.ToStr () + '".');
    console.log ('aClient Fmt = "' + newVID.Fmt.ToStr () + '"');
    console.log ('Fmt.TypeStr =' + newVID.Fmt.TypeStr);

    let F = new RS1.PackField ('Num',123);
    F.clear;
    let List = new RS1.vList ();
    let v = new RS1.vID ('ABC:DEF');
    List.x.UpdateVID (v);
    console.log ('List=' + List.toStr);

    let OutPack = new RS1.BufPack ();
    OutPack.xAdd ('H',RS1.myVilla);
    let InPack = await RS1.ReqPack (OutPack);
    RS1.mySession = InPack.fNum('!H');
    console.log ('mySession = ' + RS1.mySession.toString ());

    let Q = new RS1.qList ('Test:Desc|ABC:123|DEF:789|XYZ:xyz|');
    console.log (Q.descByName ('XYZ'));
    console.log (Q.num ('ABC').toString ());
    console.log (Q.count.toString ());
    console.log ('Names=' + Q.names);
    let ND = Q.splitNames;
    console.log ('ND=' + ND.b);
    console.log ('As=' + ND.a);
    let V = new RS1.vID ('DEF:ghq');
    Q.set ('DEF','ghq');
    Q.set ('XYZ',987);
    ND = Q.splitNames;
    console.log ('ND=' + ND.b);

    console.log ('Prebubble = ' + Q.toStr);
    Q.bubble ('DEF');
    console.log ('Postbubble = ' + Q.toStr);
    Q.bubble ('DEF',1);
    console.log ('Bubble again = ',Q.toStr);

    let XYZ = new RS1.RSI ();
    let DEF:RS1.RSD = XYZ;

	let TileStrings: string[] = [
        'TS2:TileStrings Desc',
		'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:https://moocode.lol/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];

    let RList = new RS1.rList (TileStrings);
    console.log ('RList =\n' + RList.info);
    console.log ('toStr =  ' + '\nRList.toStr=\n' + RList.toStr + '!');
    if (RList.Tree)
    console.log ('RList.TREE!!\n' + RList.Tree.expand);
    let ABC:RS1.RSD = RList;
        console.log ('RList.RSD.constructor=' + ABC.constructor.name);

    // let  TList = new RS1.TileList(TileStrings); // remove temporarily
    // console.log ('TList.ToString = \n' + TList.ToString ());

    
	let L = new RS1.qList ('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
}


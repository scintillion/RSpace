import { RS1 } from '$lib/RS';

var Serial : number = 0;

async function ABRequest (AB : ArrayBuffer): Promise<ArrayBuffer> {
    
    console.log ('ABRequest sent by Client, bytes = ' + AB.byteLength.toString () +
        '  str=' + RS1.ab2str (AB));

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

    console.log ('Response AB from server, bytes = ' + response.byteLength.toString () + 
        '  str =' + RS1.ab2str (response));

    return response;
}

async function packRequest (BP : RS1.BufPack) : Promise<RS1.BufPack>{
  console.log ('PackRequest Incoming = \n' + BP.desc);
  BP.addArgs (['#',++Serial]);

  let AB = BP.bufOut ();
  console.log ('Sending Client Request #' + Serial.toString ());

  let recvAB = await RS1.ReqAB (AB);

  BP.bufIn (recvAB);

  console.log (' ---- Pack Received Server reply #' + BP.fNum ('#').toString () + '---' + '\n' + BP.desc);

  return BP;
}

async function RSDRequest (rsd : RS1.RSD) : Promise<RS1.RSD>{
  console.log ('RSDRequest Incoming = \n' + rsd.expand);
  rsd.qSet ('#', ++Serial);
  rsd.qSet ('Client','XYZ');

  let AB = RS1.bb2ab (rsd.toBBI);
  console.log ('Sending Client Request #' + Serial.toString () + '=' + RS1.bb2str (rsd.toBBI));

  if (AB) {
    let recvAB = await RS1.ReqAB (AB);

    console.log ('client receives recvAB from server, str=' + RS1.ab2str (recvAB));

    let newRSD = new RS1.rList (recvAB);
    // BP.bufIn (recvAB);

    console.log (' ---- RSD Received newRSD from Server reply #' + newRSD.qGet ('#').toString () + 'to$=' + newRSD.to$ + '\n' + newRSD.expand);
    return newRSD;
  }

  return RS1.NILRSD;
}




export async function InitClient () {
   RS1.InitReq (ABRequest,packRequest,RSDRequest);

   let newVID = new RS1.vID ('Name:Desc');
   let newFmt = new RS1.IFmt ('');
   newVID.Fmt = newFmt;

   console.log ('Client NewVID = "' + newVID.to$ + '".');
   newVID.Fmt.setType ('#');

   newVID.Fmt.setValue ('123');
   console.log ('xClient NewVID = "' + newVID.to$ + '".');

   newVID = new RS1.vID ('Name:[R1,100=49]Desc');
    console.log ('qClient NewVID = "' + newVID.to$ + '".');

    newVID.Fmt = new RS1.IFmt ('');

    newVID.Fmt.setType('Range');
    newVID.Fmt.setXtra ('1,100');
    newVID.Fmt.setValue ('49');
    console.log ('zClient NewVID = "' + newVID.to$ + '".');
    console.log ('zClient Fmt = "' + newVID.Fmt.to$ + '"');
    console.log ('Fmt.TypeStr =' + newVID.Fmt.TypeStr);

    newVID.Fmt = RS1.IFmt.create ('Range','25,75','64');
    console.log ('aClient NewVID = "' + newVID.to$ + '".');
    console.log ('aClient Fmt = "' + newVID.Fmt.to$ + '"');
    console.log ('Fmt.TypeStr =' + newVID.Fmt.TypeStr);

    let F = new RS1.PackField ('Num',123);
    F.clear;
    let List = new RS1.qList ();
    let v = new RS1.vID ('ABC:DEF');
    List.qSetVID (v);
    console.log ('List=' + List.to$);

    let OutPack = new RS1.BufPack ();
    OutPack.xAdd ('H',RS1.myVilla);
    OutPack.addArgs (['Client', 'XYZ']);
    OutPack.addArgs (['ABC', '123']);


    //  let InPack = await RS1.ReqPack (OutPack);
    let OutRSD = new RS1.qList ();
    OutRSD.from$ ('|Client:XYZ|ABC:123|Serial:897|#:456|');
    OutRSD.qSet ('H',RS1.myVilla);
    OutRSD.mark;

    let outBBI = OutRSD.toBBI;
    // let newOut = new RS1.qList (outBBI);
    let newOut = RS1.newRSD ('',outBBI);
    console.log ('newOut='+newOut.to$+' OutRSD='+OutRSD.to$);
    if (newOut.to$ !== OutRSD.to$)
        console.log ('Mismatch');
    
    let InRSD = await RS1.ReqRSD (OutRSD);
    let ServeReply = InRSD.qGet ('ServeReply');
    RS1.mySession = InRSD.qGetNum ('!H');

 //   RS1.mySession = InPack.fNum('!H');
 //   let ServeReply = InPack.fStr ('ServeReply');

    console.log ('mySession = ' + RS1.mySession.toString () + ' ServeReply =' + ServeReply);

    let Q = new RS1.qList ('Test:Desc|ABC:123|DEF:789|XYZ:xyz|');
    console.log (Q.qDescByName ('XYZ'));
    console.log (Q.qNum ('ABC').toString ());
    console.log (Q.qCount.toString ());
    console.log ('Names=' + Q.qNames);
    let ND = Q.qSplitNames;
    console.log ('ND=' + ND.b);
    console.log ('As=' + ND.a);
    let V = new RS1.vID ('DEF:ghq');
    Q.qSet ('DEF','ghq');
    Q.qSet ('XYZ',987);
    ND = Q.qSplitNames;
    console.log ('ND=' + ND.b);

    let XYZ = new RS1.qList ();
    let DEF:RS1.RSD = XYZ;

	let TileStrings: string[] = [
        'TS2:TileStrings Desc',
		'T\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
		' T\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' T\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:msn.com/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];


	let TestTileStrings: string[] = [
        'TS2:TileStrings Desc',
		'ABCRoot\ta|name:Full|\ts|display:flex|column:1|align-items:center|background:black|width:100vw|height:100vh|\t',
		' DEFSubA\ta|name:Top|\ts|background:magenta|height:10vh|width:100vw|\t',
		' DEFSubB\ta|name:Bottom|\ts|display:flex|row:1|background:none|align-items:center|justify-content:space-evenly|\t',
		'  T\ta|name:Left|inner:I am the left side|\ts|background:orange|width:20vw|height:90vh|display:flex|column:1|gap:5|align-items:center|justify-content:center|\t',
		'   RndBtn\ta|name:Button|inner:Click|redirect:msn.com/|\ts|width:110|height:50|background:#1e1e1e|color:white|\t',
		'  T\ta|name:Middle|inner:I am the middle|\ts|background:cyan|display:flex|width:60vw|height:90vh|\t',
		'  T\ta|name:Right|inner:I am the right side|\ts|background:yellow|width:20vw|height:90vh|\t'
	];


    let ABCRootStr = 'ABCRoot\ta|name:FUBAR|\ts|display:FLEX|height:100VH|\t';
    let ABCRSI = 's|display:FLEXRSI|height:100VHabc|';

    console.log ('READING TestTileStrings');
    let targetList = new RS1.rList (TestTileStrings);
    let ABCRootList = new RS1.rList (ABCRootStr);
    let ABCRSIList = new RS1.qList (ABCRSI);

    console.log  ('targetList = ' + targetList.expand);
    console.log  ('ABCRootList = ' + ABCRootList.expand);
    console.log  ('ABCRSIList = ' + ABCRSIList.expand);
    
    ABCRootList.rMergeList (ABCRSIList);
    console.log  ('ABCRootList after RSIList merge = ' + ABCRootList.expand);
    targetList.rMergeList (ABCRootList, false);
    
    targetList._bbi = undefined; // force rebuild
    let newBBI = targetList.toBBI,bbstr = RS1.bb2str (targetList.toBBI) ;
    console.log ('New PB = ' + bbstr);
    
    let newtargetList = new RS1.rList (targetList.to$);
    if (newtargetList.to$ !== targetList.to$) {
        console.log ('targetList = ' + targetList.expand);
        console.log ('newtargetList = ' + newtargetList.expand);
    }   

    console.log  ('after ABCRootList merge, targetList = ' + targetList.expand);


    console.log ('READING TileStrings');
    let A = new RS1.rList (TileStrings);
    console.log ('A.to$=' + A.to$);
    let B = A.copy ();
    console.log ('B.to$=' + B.to$);

    console.log ('Prebubble = ' + Q.to$);
    Q.qBubble ('DEF');
    console.log ('Postbubble = ' + Q.to$);
    Q.qBubble ('DEF',1);
    console.log ('Bubble again = ',Q.to$);

    let RList = new RS1.rList (TileStrings);
    console.log ('RList =\n' + RList.info);
    let SS = RList.to$;
    console.log ('toStr =  ' + '\nRList.toStr=\n' + RList.to$+ '!');
    console.log ('RList.EXPAND=\n' + RList.expand);
    if (RList.kidTree)
        console.log ('RList.TREE!!\n' + RList.kidTree.expand);
    let ABC:RS1.RSD = RList;
        console.log ('RList.RSD.constructor=' + ABC.constructor.name);

    console.log ('Preparing TileList');
    let  TList = new RS1.TileList(RList); // remove temporarily
    console.log ('TList.ToString = \n' + TList.toStr);
    
	let L = new RS1.qList ('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
}


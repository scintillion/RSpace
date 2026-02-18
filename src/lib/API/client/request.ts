import { RS1 } from '$lib/RS';

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

async function RSDRequest (rsd : RS1.RSD) : Promise<RS1.RSD>{
    let rsdBBI = rsd.toBBI, rsdstr = RS1.bb2str (rsdBBI);
    RS1.BuildQ (rsd);
/*
    let rQ = rsd.qGetQStr, name = rsd.Name, desc = rsd.Desc, rsdName = rsd.cl, tile=RS1.zGet$ (rQ, 'Tile'), Type = rsd.Type;
    if (rsd.isList) {
        name = rsd.listName;
        let pair = rsd.namedesc ()
        desc = pair.b;
    }
    else {
        name = RS1.zGet$ (rQ, 'Name');
        desc = RS1.zGet$ (rQ, 'Desc');
    }    

    console.log ('Incoming RSDRequest ='+rsd.to$ + ' name=' + name + ' desc=' + desc + ' type=' + Type);


    let outRSD = RS1.newRSD (rsd.qGetQStr + ':#:' + (++Serial).toString () + ':' + RS1.mySession.toString () + 
            '|_Name:' + name + '|_Desc:' + desc + '|_RSD:' + rsdName + '|_Tile:' + tile + '|_Type:' + Type + '|');

    outRSD.BLOB = rsdBBI;
 */

    let AB = RS1.bb2ab (rsd.toBBI);
    console.log ('Sending Client Request #' + RS1.mySerial.toString () + '=' + RS1.bb2str (rsd.toBBI) + ' BYTES=' + AB.byteLength.toString ());
    let testCmd = new RS1.RSDCmd (rsd);


    if (AB) {
        let recvAB = await RS1.ReqAB (AB);
        console.log ('client receives recvAB from server, bytes=' + recvAB.byteLength);
        let str = RS1.ab2str (recvAB);
        console.log ('recvAB =\n' + str);

        if (str.length > 2000)
            console.log ('BIG BATCH!');

        let newRSD = RS1.newRSD (recvAB), cmd = new RS1.RSDCmd (newRSD, false);
        if (!RS1.xmySession) { //looking for first message
            let CmdStr = newRSD.qGet ('_#'), cmds = CmdStr.split (':');
            RS1.xmySession = Number (cmds[1]);
            RS1.myServer = cmds[2];
            console.log ('Server connected, Session ' + RS1.xmySession + ' Server=' + RS1.myServer);
        }

        if (newRSD.BLOB)
            console.log ('  client receives RSD, BLOB bytes=' + newRSD.BLOB.byteLength + ' checksum=' + RS1.checksumBuf (newRSD.BLOB));
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

    //  let InPack = await RS1.ReqPack (OutPack);
    let OutRSD = new RS1.RSD ('|?:Hello:LoginID|Client:XYZ|ABC:123|Serial:897|');
    
    let InRSD = await RS1.ReqRSD (OutRSD);

	OutRSD.from$ ('|?QSQL:SELECT|?Type:List|?Row:S|');
    let newRSD = await RS1.ReqRSD (OutRSD);
    let SQLRSD = new RS1.RSD (newRSD.BLOB);

    console.log ('\f\n\n\n\n\n\n\nSQLRSD nKids=' + SQLRSD.kidCount (true).toString () + '  ===\n' + SQLRSD.expand);


    OutRSD.from$ ('|?:Bye:Riding into the sunset.|');
    InRSD = await RS1.ReqRSD (OutRSD);

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
    let ABCstr = RS1.bb2str (ABCRSIList.toBBI);
    console.log ('ABC bbi=' + ABCstr + ' ABC.to$=' + ABCRSIList.to$);
    let newABC = RS1.newRSD (ABCRSIList.toBBI);
    if (newABC.to$ !== ABCRSIList.to$)
        ABCstr = ABCstr;

    console.log  ('targetList = ' + targetList.expand);
    console.log  ('ABCRootList = ' + ABCRootList.expand);
    console.log  ('ABCRSIList = ' + ABCRSIList.expand);
    
    ABCRootList.rMergeList (ABCRSIList);
    console.log  ('ABCRootList after RSIList merge = ' + ABCRootList.expand);
    targetList.rMergeList (ABCRootList, false);
    
    targetList.mark; // force rebuild
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

    RS1.rLoL.SaveLists ();
    let SelectRSD = await RS1.DBSelect ('|_Name:FM|');
    for (const r of SelectRSD) {
        console.log (r.cl + ' $=' + r.to$);
    }

    // RS1.DBDelete ([140,150,160]);
    RS1.DBDelete (162);
    RS1.DBSelect ();
    // console.log ('SelectRSD Bytes =' + SelectRSD.BLOB.byteLength.toString ());

	let L = new RS1.qList ('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
}

async function packRequest (BP : RS1.BufPack) : Promise<RS1.BufPack>{
    return new RS1.BufPack ();
}



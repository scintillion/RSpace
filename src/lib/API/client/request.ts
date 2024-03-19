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
  BP.add (['#',++Serial]);

  let AB = BP.bufOut ();
  console.log ('Sending Client Request #' + Serial.toString ());

  let recvAB = await RS1.ReqAB (AB);

  BP.bufIn (recvAB);

  console.log (' ---- Received Server reply #' + BP.num ('#').toString () + '\n' + BP.desc);

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
    F.clear ();
    let List = new RS1.vList ('|');
    let v = new RS1.vID ('ABC:DEF');
    List.UpdateVID (v);
    console.log ('List=' + List.getStr);
}

